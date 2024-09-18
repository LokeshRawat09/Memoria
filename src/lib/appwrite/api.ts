import { INewPost, INewUser, IUpdatePost } from "@/types";
import { account, appwriteConfig, avatars, databases, storage } from "./config";
import {ID, ImageGravity, Query} from 'appwrite'

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user:INewUser){
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name,
        )
        
        if(!newAccount) throw Error;
        
        const avatarUrl = avatars.getInitials(user.name);
        // const avatarUrl = avatars.getInitials(user.name).toString();

        const newUser = await saveUserToDB({
            accountId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            username: user.username,
            imageUrl: avatarUrl,
        });

        return newUser;

    } catch (error) {
        console.log(error);
        return error;
    }
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
    accountId: string;
    email: string;
    name: string;
    imageUrl: URL;
    // imageUrl: string;
    username?: string;
}){
    try {
        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user,
        )
        return newUser;
    } catch (error) {
        console.log("Error saving user to database:", error);
        return error;
    }
}

// ============================== SIGN IN
export async function signInAccount(user: {email: string; password: string;}){
    try {
        const session = await account.createEmailPasswordSession(user.email, user.password);
        return session;
    } catch (error) {
        console.log(error);
    }
}

// export async function signInAccount(user: {email: string; password: string;}){
//     try {
//         // Check if a session already exists
//         const existingSession = await account.getSession('current');
//         if (existingSession) {
//             return existingSession;
//         }

//         // If no active session, create a new session
//         const session = await account.createEmailPasswordSession(user.email, user.password);
//         return session;
//     } catch (error) {
//         // Handle specific error when session already exists
//         console.log("Error in sign-in:", error);
//         return null;
//     }
// }


// export async function getCurrentUser(){
//     try {
//         const currentAccount = await account.get();
//         if(!currentAccount) throw Error;

//         const currentUser = await databases.listDocuments(
//             appwriteConfig.databaseId,
//             appwriteConfig.userCollectionId,
//             [Query.equal('accountId',currentAccount.$id)]
//         );
//         if(!currentUser) throw Error;

//         return currentUser.documents[0];
//     } catch (error) {
//         console.log(error);
//     }
// }


// ============================== GET ACCOUNT
export async function getAccount() {
    try {
    const currentAccount = await account.get();
    return currentAccount;
    } catch (error) {
    console.log(error);
    }
}


// ============================== GET USER

export async function getCurrentUser() {
    try {
        const currentAccount = await getAccount();
        if (!currentAccount) {
            throw new Error("No account found, user might not be authenticated.");
        }

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        );

        if (!currentUser || currentUser.total === 0) {
            throw new Error("No user found in the database matching the account.");
        }

        return currentUser.documents[0];
    } catch (error) {
        console.error("Error fetching current user:", error);
        throw error; 
    }
}


export async function signOutAccount(){
    try {
        const session = await account.deleteSession("current");
        return session;
    } catch (error) {
        console.log(error);        
    }
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost){
    try {
        // Upload image to storage
        const uploadedFile = await uploadFile(post.file[0]);

        if(!uploadedFile) throw Error;

        // Get file url
        const fileUrl =  getFilePreview(uploadedFile.$id);
        // const fileUrl = await getFilePreview(uploadedFile.$id);

        if(!fileUrl){
            // in this with throw error, we also want to delete the file because something was corrupted
            await deleteFile(uploadedFile.$id);
            throw Error;
        }

        // if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.length > 2000) {
        //     // If the URL is invalid or too long, delete the uploaded file and throw an error
        //     await deleteFile(uploadedFile.$id);
        //     throw new Error("Invalid file URL or URL exceeds 2000 characters");
        // }

        // Convert tags into an arrays
        const tags = post.tags?.replace(/ /g,'').split(',') || [];

        // Save post to database
        const newPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            ID.unique(),
            {
                creator: post.userId,
                caption: post.caption,
                imageUrl: fileUrl,
                imageId: uploadedFile.$id,
                location: post.location,
                tags: tags
            }
        )
        if(!newPost){
            // we delete file because of something is wrong and we doesn't want to overload our storage
            await deleteFile(uploadedFile.$id);
            throw Error;
        }

        return newPost;
        
    } catch (error) {
        console.log(error);
    }
} 

// ============================== UPLOAD FILE
export async function uploadFile(file: File){
    try {
        const uploadedFile = await storage.createFile(
            appwriteConfig.storageId,
            ID.unique(),
            file
        );
        return uploadedFile;
    } catch (error) {
        console.log(error);
        
    }
}

export function getFilePreview(fileId: string){
    try {
        const fileUrl = storage.getFilePreview(
            appwriteConfig.storageId,
            fileId,
            2000,
            2000,
            ImageGravity.Top,
            100,
        )
        if (!fileUrl) throw Error;
        return fileUrl;
        // const fileUrlString = fileUrl.toString();  // Convert URL to string
        // return fileUrlString;
    } catch (error) {
        console.log(error);
    }
}

// in Above it is returing promise so i have removed async
// export async function getFilePreview(fileId: string){
//     try {
//         const fileUrl = storage.getFilePreview(
//             appwriteConfig.storageId,
//             fileId,
//             2000,
//             2000,
//             ImageGravity.Top,
//             100,
//         )
//         if (!fileUrl) throw Error;
//         // return fileUrl;
//         const fileUrlString = fileUrl.toString();  // Convert URL to string
//         return fileUrlString;
//     } catch (error) {
//         console.log(error);
//     }
// }

// ============================== DELETE FILE
export async function deleteFile(fileId: string){
    try {
        await storage.deleteFile(appwriteConfig.storageId, fileId);
        return {status: "ok"};
    } catch (error) {
        console.log(error);
    }
}

export async function getRecentPosts(){
    const posts = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(20)]
    )

    if(!posts) throw Error;

    return posts;
}

export async function likePost(postId: string, likesArray: string[]) {
    try {
        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId,
            {
                likes: likesArray
            }
        )
        if(!updatedPost) throw Error;
        return updatedPost;
        
    } catch (error) {
        console.log(error);
        
    }  
}

export async function savePost(postId: string, userId: string) {
    try {
        const updatedPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            ID.unique(),
            {
                user: userId,
                post: postId,
            }
        )
        if(!updatedPost) throw Error;
        return updatedPost;
        
    } catch (error) {
        console.log(error);
        
    }  
}

export async function deleteSavedPost(savedRecordId: string) {
    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            savedRecordId,
        )
        if(!statusCode) throw Error;
        return {status: 'ok'};
        
    } catch (error) {
        console.log(error);
        
    }  
}

export async function getPostById(postId: string){
    try {
        const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        )
        return post;
    } catch (error) {
        console.log(error)
        
    }
}

export async function updatePost(post: IUpdatePost){
    const hasFileToUpdate = post.file.length > 0;
    try {
        let image = {
            imageUrl: post.imageUrl,
            imageId: post.imageId,
        }
        
        if(hasFileToUpdate){
            // Upload image to storage
            const uploadedFile = await uploadFile(post.file[0]);   
            if(!uploadedFile) throw Error;

            // Get file url
            const fileUrl =  getFilePreview(uploadedFile.$id);
 
            if(!fileUrl){
            // in this with throw error, we also want to delete the file because something was corrupted
            await deleteFile(uploadedFile.$id);
            throw Error;
        }
        image = {...image, imageUrl: fileUrl, imageId: uploadedFile.$id};
        }
        
        // Convert tags into an arrays
        const tags = post.tags?.replace(/ /g,'').split(',') || [];

        // Save post to database
        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            post.postId,
            {
                caption: post.caption,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
                location: post.location,
                tags: tags
            }
        )
        if(!updatedPost){
            // we delete file because of something is wrong and we doesn't want to overload our storage
            await deleteFile(post.imageId);
            throw Error;
        }

        return updatedPost;
        
    } catch (error) {
        console.log(error);
    }
} 

export async function deletePost(postId: string, imageId: string){
    if(!postId || !imageId) throw Error;

    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        )
        return {status: 'ok'};
    } catch (error) {
        console.log(error);
    }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }){
    // pageParam is a number of how many pages or document we want to skip
    const queries: any[]  = [Query.orderDesc('$updatedAt'), Query.limit(9)];

    if(pageParam){
        queries.push(Query.cursorAfter(pageParam.toString()));
    }

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            queries
        )
        if(!posts || !posts.documents ) throw Error;
        return posts;

    } catch (error) {
        console.log(error);
    }
}

export async function searchPosts(searchTerm: string){
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [Query.search('caption', searchTerm)]
        )
        if(!posts) throw Error;
        return posts;

    } catch (error) {
        console.log(error);
    }
}

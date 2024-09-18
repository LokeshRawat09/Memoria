import React from 'react'
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useToast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Loader from '@/components/shared/Loader'
import {Form,FormControl,FormField,FormItem,FormLabel,FormMessage,} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SigninValidation } from '@/lib/validation'
import { useSignInAccount } from '@/lib/react-query/queriesAndMutations'
import { z } from 'zod'
import { useUserContext } from '@/context/AuthContext'

const SigninForm = () => {
  const { toast } = useToast();

  const navigate = useNavigate();

  const {checkAuthUser, isLoading: isUserLoading} = useUserContext();

  const {mutateAsync: signInAccount} = useSignInAccount();

  // 1. Define your form.
  const form = useForm<z.infer<typeof SigninValidation>>({
    resolver: zodResolver(SigninValidation),
    defaultValues: {
      email: "",
      password: "",
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof SigninValidation>) {
    try {
    const session = await signInAccount({
      email: values.email,
      password: values.password,
    })

    if(!session){
      return toast({ title: "Sign in failed. Please try again." })
    }
    // after this signIn we have to store the session in the react context, so that we will know the state of the user
  
    const isLoggedIn = await checkAuthUser();

    if(isLoggedIn){
      form.reset();
      navigate('/');
    }

    else{
      return toast({ title: "Sign in failed. Please try again." })
    }

  } catch (error) {
    console.error("Sign in error:", error);
    toast({ title: "An error occurred. Please try again." });
  }
  
  }
  return (
    <Form {...form} >
      <div className='sm:w-420 flex-center flex-col'>
        <img src="/assets/images/logo.svg" alt="logo"/>

        <h2 className='h3-bold md:h2-bold pt-5 sm:pt-12'>Log in to your account</h2>
        <p className='text-light-3 small-medium md:base-regular mt-2'>Welcome back! Please enter your details</p>  
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full mt-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" className='shad-input' placeholder='Enter username' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" className='shad-input' placeholder='Enter username' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className='shad-button_primary'>
            {isUserLoading ? (
              <div className='flex-center gap-2'>
                <Loader/> Loading...
              </div>
            ): "Sign in"}
          </Button>
          <p className='text-small-regular text-light-2 text-center mt-2'>
            Don't have an account?
            <Link to="/sign-up" className='text-primary-500 text-small-semibold ml-1'>Sign up</Link>
          </p>
        </form>
      </div>
  </Form>
  );
}

export default SigninForm;
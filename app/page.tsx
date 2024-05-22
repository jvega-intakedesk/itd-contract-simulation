'use client'
 
import { useState } from 'react'
import Image from "next/image";
import App from './src/AppReact';


export default function Home() {
  return (
    <main className="">
      <div className="" style={{marginLeft: 2 + '%'}}>
      <div>
            <h1>Welcome to the Fulfillment Orders Simulator</h1>
            <App />
        </div>
      </div>      
    </main>
  );
}

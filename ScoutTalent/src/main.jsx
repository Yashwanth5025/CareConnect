import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {createBrowserRouter , RouterProvider} from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Player from './Player.jsx'
import Scoutmar from './Scoutmar.jsx'
import Signup from './Signup.jsx'
import PlayerList from './Playerlist.jsx'
import Login from './Login.jsx'
import PlayerInfo from './PlayerInfo.jsx'
import ContactUs from './ContactUs.jsx'
import About from './About.jsx'
import Chat from './Chat.jsx'
import Records from './Records.jsx'
import DarkVeil from './Darkveil.jsx'
import Agent from './Agent.jsx'
import Sprofile from './Sprofile.jsx'
import Cart from './Cart.jsx'

const router=createBrowserRouter([
  {
    path: '/',
    element: <App/>
  },
  {
    path: '/login',
    element: <Login/>
  },
  {
    path:"/About",
    element:<About/>
  },
  {
    path: '/signup',
    element: <Signup/>
  },
  {
    path:"/Playerlist",
    element:<PlayerList/>
  },
  {
    path:"/Scoutmar",
    element:<Scoutmar/>
  },
  {
    path:"/player",
    element:<Player/>
  },
  {
    path:"/PlayerInfo/:id",
    element:<PlayerInfo />
  },
  {
    path:"/ContactUs",
    element:<ContactUs/>
  },
  {
    path:"/chat",
    element:<Chat/>
  },
  {
    path:"/Records",
    element:<Records/>
  },
  {
    path:"/Darkveil",
    element: <DarkVeil
    hueShift={20}
        noiseIntensity={0}
        scanlineIntensity={0}
        speed={2.5}
        scanlineFrequency={3}
        warpAmount={0.05}
    />
  },
  {
    path:"/Agent",
    element:<Agent/>
  },
  {
    path:'/Sprofile',
    element:<Sprofile/>
  },
  {
    path:"/Cart",
    element:<Cart/>
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)

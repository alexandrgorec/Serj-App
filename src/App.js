import 'bootstrap/dist/css/bootstrap.min.css';
import NewOrder from "./NewOrder";
import FooterApp from './FooterApp';
import AllOrders from './AllOrders';
import Login from './Login';
import { useState, useEffect, createContext } from 'react';
import axios from 'axios';
import './App.css';
import { MdLogout } from "react-icons/md";
import Stack from 'react-bootstrap/Stack';
import Menu from './Menu';
import { FaCircleUser } from "react-icons/fa6";




export const userContext = createContext();


function App() {
  const PORT = window.location.port === '3000' ? 3001 : window.location.port;
  const [token, setToken] = useState(window.localStorage.token);
  const [user, setUser] = useState({
    name: '',
    rights: {},
    selectListsData: {
      SUPPLIERS: [],
      BUYERS: [],
      DRIVERS: [],
      TYPE_OF_PRODUCT: [],
      MANAGERS: [],
      user: {},
    }
  })
  const logOut = () => {
    delete window.localStorage.token;
    setActiveComponent('NewOrder')
    setToken(null);
  }



  const [activeComponent, setActiveComponent] = useState("NewOrder");
  const [newOrder, setNewOrder] = useState({
    suppliers: [],
    buyers: [],
  });


  let buttons = document.querySelectorAll(".footerButton");
  buttons.forEach(button => {
    button.classList.remove("activeButton");
  })
  buttons.forEach(button => {
    if (button.classList.value.includes(activeComponent))
      button.classList.add("activeButton");
  })

  useEffect(() => {
    if (token)
      axios.post(`http://${window.location.hostname}:${PORT}/getData`, { token })
        .then((response) => {
          if (response.status === 202) {
            setUser(response.data.user);
          }
        })
        .catch((error) => {
          if (error.response.status === 999) {
            logOut();
          }
        })
  }, [token]);



  const height = (window.innerHeight / window.outerHeight) > 0.85 ? 100 : 89.7;
  return (
    <userContext.Provider value={{token, logOut, user, setUser, PORT}}>
      {!token && <Login setToken={setToken} />}
      {token && <div style={{ height: `${height}vh` }}>
        <div className='app' >
          <Stack direction="horizontal" gap={3} className='activeComponentHeader'>
            <Stack style={{ userSelect: 'none', cursor: 'pointer' }} direction="horizontal" gap={1}><div className='logo'></div>Santo</Stack >
            <div className='p-2 ms-auto noselect' style={{ cursor: 'pointer' }}>{user.name}  <FaCircleUser style={{ paddingBottom: '2px' }} size={'1.5em'} /></div>
            <div onClick={logOut} className="p-2 noselect" style={{ cursor: 'pointer' }}><MdLogout style={{ paddingBottom: '2px' }} size={'1.5em'} className='icon ms-auto' />Выход</div>
          </Stack>
          <div className='content'>
            {activeComponent === "NewOrder" ? <NewOrder order={newOrder} setOrder={setNewOrder} setActiveComponent={setActiveComponent} /> : ""}
            {activeComponent === "AllOrders" ? <AllOrders  /> : ""}
            {activeComponent === "Menu" ? <Menu /> : ""}
          </div>
          <FooterApp setActiveComponent={setActiveComponent}/>
        </div>
      </div>}
    </userContext.Provider>
  );
}

export { App as default };




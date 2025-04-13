import 'bootstrap/dist/css/bootstrap.min.css';
import NewOrder from "./NewOrder";
import FooterApp from './FooterApp';
import AllOrders from './AllOrders';
import Login from './Login';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { MdLogout } from "react-icons/md";
import Stack from 'react-bootstrap/Stack';
import Menu from './Menu';
import { FaCircleUser } from "react-icons/fa6";





const PORT = window.location.port === '3000' ? 3001 : window.location.port;

function App() {
  const [token, setToken] = useState(window.localStorage.token);
  const [user, setUser] = useState({
    name: '',
    rights: {},
  })
  const logOut = () => {
    delete window.localStorage.token;
    setActiveComponent('Новая заявка')
    setToken(null);
  }



  const [activeComponent, setActiveComponent] = useState("Новая заявка");
  const [selectListsData, setSelectListsData] = useState({
    SUPPLIERS: [],
    BUYERS: [],
    DRIVERS: [],
    TYPE_OF_PRODUCT: [],
    MANAGERS: [],
    user:{},
  });
  const [newOrder, setNewOrder] = useState({
    suppliers: [],
    buyers: [],
  });

  useEffect(() => {
    if (token)
    axios.post(`http://${window.location.hostname}:${PORT}/getData`,{token})
      .then((response) => {
        if (response.status === 202) {
          setSelectListsData(response.data.selectListsData);
          setUser(response.data.user);
        }
      })
      .catch( (error) => {
        if (error.response.status === 999) {
          logOut();
        }
      })
  }, [token]);



  if (!token)
    return (<Login setToken={setToken}/>);
  const height = (window.innerHeight / window.outerHeight) > 0.85 ? 100 : 89.7;

  return (
    <div style={{ height: `${height}vh` }}>
      <div className='app' >
        {/* <div className='activeComponentHeader'> */}
        <Stack direction="horizontal" gap={3} className='activeComponentHeader'>
          <Stack style={{ userSelect: 'none', cursor: 'pointer' }} direction="horizontal" gap={1}><div className='logo'></div>Santo</Stack >
          <div  className='p-2 ms-auto noselect' style={{ cursor: 'pointer' }}>{user.name}  <FaCircleUser style={{ paddingBottom: '2px' }} size={'1.5em'}/></div>
          <div onClick={logOut} className="p-2 noselect" style={{ cursor: 'pointer' }}><MdLogout style={{ paddingBottom: '2px' }} size={'1.5em'} className='icon ms-auto' />Выход</div>
        </Stack>
        {/* </div> */}
        <div className='content'>
          {activeComponent === "Новая заявка" ? <NewOrder order={newOrder} PORT={PORT} setOrder={setNewOrder} selectListsData={selectListsData} logOut={logOut} token={token} user={user}/> : ""}
          {activeComponent === "Все заявки" ? <AllOrders PORT={PORT} selectListsData={selectListsData} logOut={logOut} token={token} user={user}/> : ""}
          {activeComponent === "Меню" ? <Menu /> : ""}
        </div>
        <FooterApp setActiveComponent={setActiveComponent} activeComponent={activeComponent} />
      </div>
    </div>
  );
}

export default App;




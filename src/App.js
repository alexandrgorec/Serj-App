import 'bootstrap/dist/css/bootstrap.min.css';
import NewOrder from "./NewOrder";
import FooterApp from './FooterApp';
import AllOrders from './AllOrders';
import Login from './Login';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';



const PORT = window.location.port === '3000' ? 3001 : window.location.port;

function App() {
  const [token, setToken] = useState(window.localStorage.token);
  const logOut = () => {
    delete window.localStorage.token;
    setToken(null);
  }

  const [activeComponent, setActiveComponent] = useState("Новая заявка");
  const [selectListsData, setSelectListsData] = useState({
    SUPPLIERS: [],
    BUYERS: [],
    DRIVERS: [],
    TYPE_OF_PRODUCT: [],
    MANAGERS: [],
  });
  const [newOrder, setNewOrder] = useState({
    suppliers: [],
    buyers: [],
  });

  useEffect(() => {
    axios.post(`http://${window.location.hostname}:${PORT}/getListsData`)
      .then((response) => {
        if (response.status === 202) {
          setSelectListsData(response.data);
        }
      })
  }, [null]);

  if (!token)
    return (<Login setToken={setToken} />);
  const height = (window.innerHeight / window.outerHeight) > 0.85 ? 100 : 89.7;

  return (
    <div style={{ height: `${height}vh` }}>
      <div className='app' >
        <div className='activeComponentHeader'>{activeComponent}</div>
        <div className='content'>
          {activeComponent === "Новая заявка" ? <NewOrder order={newOrder} PORT={PORT} setOrder={setNewOrder} selectListsData={selectListsData} token={token} /> : ""}
          {activeComponent === "Все заявки" ? <AllOrders PORT={PORT} selectListsData={selectListsData} logOut={logOut} token={token} /> : ""}
        </div>
        <FooterApp setActiveComponent={setActiveComponent} activeComponent={activeComponent} />
      </div>
    </div>
  );
}

export default App;




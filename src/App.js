import 'bootstrap/dist/css/bootstrap.min.css';
import NewOrder from "./NewOrder";
import FooterApp from './FooterApp';
import AllOrders from './AllOrders';
import Login from './Login';
import { useState } from 'react';
import './App.css';


const PORT = window.location.port === '3000' ? 3001 : window.location.port;



function App() {
  const [auth, setAuth] = useState(false);
  const [activeComponent, setActiveComponent] = useState("Новая заявка");
  const [state, reload] = useState(false);
  const [newOrder, setNewOrder] = useState({
    suppliers: [],
    buyers: [],
  });
  if (!auth)
    return (<Login setAuth={setAuth} />);

 const height = (window.innerHeight/window.outerHeight) > 0.85 ? 100 : 89.7;
  // 
  return (
    <div style={{ height: `${height}vh` }}>
      <div className='app' >
        <div className='activeComponentHeader'>{activeComponent}</div>
        <div className='content'>
          {activeComponent === "Новая заявка" ? <NewOrder order={newOrder} setOrder={setNewOrder} /> : ""}
          {activeComponent === "Все заявки" ? <AllOrders /> : ""}
        </div>
        <FooterApp setActiveComponent={setActiveComponent} activeComponent={activeComponent} />
      </div>
    </div>
  );
}

export default App;

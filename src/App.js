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
  let h = window.innerHeight;
  setInterval(() => {
    if (h != window.innerHeight)
      h = window.innerHeight;
    else {
      reload(!state);
    }
  }, 500)
  return (
    <>
      <div className='app' style={{ gridTemplateRows: `${0.05 * h}px ${0.85 * h}px ${0.1 * h}px` }}>
        <div className='activeComponentHeader'>{activeComponent}</div>
        <div className='content'>
          {activeComponent === "Новая заявка" ? <NewOrder order={newOrder} setOrder={setNewOrder} /> : ""}
          {activeComponent === "Все заявки" ? <AllOrders /> : ""}
        </div>
        <FooterApp setActiveComponent={setActiveComponent} activeComponent={activeComponent} />
      </div>
    </>
  );
}

export default App;

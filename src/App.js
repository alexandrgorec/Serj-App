import 'bootstrap/dist/css/bootstrap.min.css';

import NewOrder from "./NewOrder";
import FooterApp from './FooterApp';
import AllOrders from './AllOrders';
import { useState } from 'react';


function App() {
  const [activeComponent,setActiveComponent] = useState("NewOrder");
  const [newOrder, setNewOrder] = useState({
    suppliers: [],
    buyers: [],
  });
  return (
    <div style={{padding:'1px'}}>
     {activeComponent === "NewOrder"  ? <NewOrder order={newOrder} setOrder={setNewOrder} /> : ""}
     {activeComponent === "AllOrders" ? <AllOrders /> : ""}
     <FooterApp setActiveComponent={setActiveComponent} activeComponent={activeComponent}/>
    </div>
  );
}

export default App;

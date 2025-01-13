import 'bootstrap/dist/css/bootstrap.min.css';

import NewOrder from "./NewOrder";
import FooterApp from './FooterApp';
import { useState } from 'react';


function App() {
  const [activeComponent,setActiveComponent] = useState("NewOrder");
  const [newOrder, setNewOrder] = useState({
    suppliers: [],
    buyers: [],
  });
  return (
    <>
     {activeComponent === "NewOrder" ? <NewOrder order={newOrder} setOrder={setNewOrder} /> : ""}
     <FooterApp setActiveComponent={setActiveComponent}/>
    </>
  );
}

export default App;

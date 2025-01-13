import React from 'react';
import './FooterApp.css';
import { Button } from 'react-bootstrap';



function FooterApp({ setActiveComponent }) {
  const setActiveButton = (buttonText) => {
    let buttons = document.querySelectorAll(".footerButton");
    buttons.forEach(button => {
      button.classList.remove("btn-outline-info");
      button.classList.add("btn-outline-secondary");
      if (button.innerText === buttonText) {
        button.classList.remove("btn-outline-secondary");
        button.classList.add("btn-outline-info");
      }
    })
  }
  const activeNewOrder = (evt) => {
    setActiveButton(evt.target.innerText);
    setActiveComponent((active) => active = "NewOrder");
  }
  const activeAllOrders = (evt) => {
    setActiveButton(evt.target.innerText);
    setActiveComponent((active) => active = "AllOrders");
  }
  return (
    <div className='footer'>
      <Button variant="outline-secondary" size="sm" className='footerButton' onClick={activeNewOrder}>Новая заявка</Button>
      <Button variant="outline-secondary" size="sm" className='footerButton' onClick={activeAllOrders}>Все заявки</Button>
    </div>


  );
}

export default FooterApp;

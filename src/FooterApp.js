import React from 'react';
import './FooterApp.css';
import { FaRegEdit } from "react-icons/fa";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { LuWarehouse } from "react-icons/lu";
import { useEffect } from 'react';
import { GiHamburgerMenu } from "react-icons/gi";






function FooterApp({ setActiveComponent, activeComponent }) {


  const dropActiveStateFooterButtons = () => {
    let buttons = document.querySelectorAll(".footerButton");
    buttons.forEach(button => {
      button.classList.remove("activeButton");
    })
  }
  const activeNewOrder = () => {
    dropActiveStateFooterButtons();
    let button = document.querySelector(".divNewOrder");
    button.classList.add("activeButton");
    window.scrollTo(0, 0);
    setActiveComponent((active) => active = "Новая заявка");
  }
  const activeAllOrders = () => {
    dropActiveStateFooterButtons();
    let button = document.querySelector(".divAllOrders");
    button.classList.add("activeButton");
    window.scrollTo(0, 0);
    setActiveComponent((active) => active = "Все заявки");
  }

  const activeWareHouse = () => {
    dropActiveStateFooterButtons();
    let button = document.querySelector(".divWareHouse");
    button.classList.add("activeButton");
    window.scrollTo(0, 0);
    setActiveComponent((active) => active = "Склад");
  }

  const activeMenu = () => {
    dropActiveStateFooterButtons();
    let button = document.querySelector(".divMenu");
    button.classList.add("activeButton");
    window.scrollTo(0, 0);
    setActiveComponent((active) => active = "Меню");
  }

  useEffect(() => {
    let buttons = document.querySelectorAll(".footerButton");
    buttons.forEach(button => {
      if (button.classList.value.includes(activeComponent))
        button.classList.add("activeButton");
    })
  })


  return (
    <div className='footer'>
      <div variant="outline-secondary" className='footerButton divNewOrder activeButton' onClick={activeNewOrder} >
        <FaRegEdit size="3em" /><br />
        Новая заявка
      </div>
      <div variant="outline-secondary" className='footerButton divAllOrders' onClick={activeAllOrders} >
        <MdOutlineLibraryBooks size="3em" /><br />
        Все заявки
      </div>
      <div variant="outline-secondary" className='footerButton divWareHouse' onClick={activeWareHouse} >
        <LuWarehouse size="3em" /><br />
        Склад
      </div>
      <div variant="outline-secondary" className='footerButton divMenu' onClick={activeMenu} >
        <GiHamburgerMenu size="3em" /><br />
        Меню
      </div>
     
    </div>


  );
}

export default FooterApp;

// { <div className="p-2"><GiHamburgerMenu style={{ cursor: 'pointer' }} size={'2em'} /></div>}
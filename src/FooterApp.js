import React from 'react';
import './FooterApp.css';
import { FaRegEdit } from "react-icons/fa";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { LuWarehouse } from "react-icons/lu";
import { useEffect } from 'react';
import { GiHamburgerMenu } from "react-icons/gi";






function FooterApp({ setActiveComponent, activeComponent }) {

  return (
    <div className='footer'>
      <div variant="outline-secondary" className='footerButton divNewOrder activeButton' onClick={ () => {setActiveComponent((active) => active = "NewOrder");}} >
        <FaRegEdit size="3em" /><br />
        Новая заявка
      </div>
      <div variant="outline-secondary" className='footerButton divAllOrders' onClick={ () => {setActiveComponent((active) => active = "AllOrders");}} >
        <MdOutlineLibraryBooks size="3em" /><br />
        Все заявки
      </div>
      <div variant="outline-secondary" className='footerButton divWareHouse' onClick={ () => {setActiveComponent((active) => active = "WareHouse");}} >
        <LuWarehouse size="3em" /><br />
        Склад
      </div>
      <div variant="outline-secondary" className='footerButton divMenu' onClick={ () => {setActiveComponent((active) => active = "Menu");}} >
        <GiHamburgerMenu size="3em" /><br />
        Меню
      </div>
     
    </div>


  );
}

export default FooterApp;

// { <div className="p-2"><GiHamburgerMenu style={{ cursor: 'pointer' }} size={'2em'} /></div>}
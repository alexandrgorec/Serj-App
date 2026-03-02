import React from 'react';
import './FooterApp.css';
import { FaRegEdit } from "react-icons/fa";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { LuWarehouse } from "react-icons/lu";
import { GiHamburgerMenu } from "react-icons/gi";
import { NavLink } from 'react-router-dom';


function FooterApp() {

  return (
    <div className='footer'>
      <NavLink tabIndex={-1} to="/neworder" className='footerButton'  >
        <FaRegEdit size="3em" /><br />
        Новая заявка
      </NavLink>
      <NavLink tabIndex={-1}  to="/allorders" className='footerButton'  >
        <MdOutlineLibraryBooks size="3em" /><br />
        Все заявки
      </NavLink>
      <NavLink tabIndex={-1}  to="/warehouse" className='footerButton'  >
        <LuWarehouse size="3em" /><br />
        Склад
      </NavLink>
      <NavLink tabIndex={-1}  to="/menu" className='footerButton' >
        <GiHamburgerMenu size="3em" /><br />
        Меню
      </NavLink>
    </div>
  );
}

export default FooterApp;

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
        <FaRegEdit className="footerIcon" />
        <span className="footerLabel">Новая заявка</span>
      </NavLink>
      <NavLink tabIndex={-1}  to="/allorders" className='footerButton'  >
        <MdOutlineLibraryBooks className="footerIcon" />
        <span className="footerLabel">Все заявки</span>
      </NavLink>
      <NavLink tabIndex={-1}  to="/warehouse" className='footerButton'  >
        <LuWarehouse className="footerIcon" />
        <span className="footerLabel">Склад</span>
      </NavLink>
      <NavLink tabIndex={-1}  to="/menu" className='footerButton' >
        <GiHamburgerMenu className="footerIcon" />
        <span className="footerLabel">Меню</span>
      </NavLink>
    </div>
  );
}

export default FooterApp;

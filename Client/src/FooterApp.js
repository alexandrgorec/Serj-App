import React from 'react';
import './FooterApp.css';
import { MdOutlineEmail, MdOutlineLibraryBooks } from "react-icons/md";
import { GiHamburgerMenu } from "react-icons/gi";
import { NavLink } from 'react-router-dom';


function FooterApp() {

  return (
    <div className='footer'>
      <NavLink tabIndex={-1}  to="/mailing" className='footerButton'  >
        <MdOutlineEmail className="footerIcon" />
        <span className="footerLabel">Рассылка</span>
      </NavLink>
      <NavLink tabIndex={-1}  to="/allorders" className='footerButton'  >
        <MdOutlineLibraryBooks className="footerIcon" />
        <span className="footerLabel">Все заявки</span>
      </NavLink>
      <NavLink tabIndex={-1}  to="/menu" className='footerButton' >
        <GiHamburgerMenu className="footerIcon" />
        <span className="footerLabel">Меню</span>
      </NavLink>
    </div>
  );
}

export default FooterApp;

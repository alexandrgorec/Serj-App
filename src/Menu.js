import './Menu.css'

import { TiUserAdd } from "react-icons/ti";
import { FaUserEdit } from "react-icons/fa";
import { TiUserDelete } from "react-icons/ti";
import { FaUser } from "react-icons/fa";

import { useContext } from 'react';
import { userContext } from './App';
import {  Link } from 'react-router-dom';

function Menu() {
    const { user } = useContext(userContext);
    return (
        <div className='menu col-md-4 mt-1 mx-auto'>

            {user.rights.adminAccess &&
                <Link className='menuComponent nodecoration' to="/menu/adduser">
                    <TiUserAdd size="3em" /><br />
                    Добавить <br /> пользователя
                </Link>
            }


            {user.rights.adminAccess &&
                <Link className='menuComponent nodecoration' to="/menu/deleteuser">
                    <TiUserDelete size="3em" /><br />
                    Удалить <br /> пользователя
                </Link>
            }

            {/* {user.name !== 'root' &&
                <Link className='menuComponent nodecoration' to="/menu/profile">
                    <FaUser size="3em" /><br />
                    Профиль
                </Link>
            } */}
        </div>
    )
}

export default Menu;
import './Menu.css'

import { TiUserAdd } from "react-icons/ti";
import { FaUserEdit } from "react-icons/fa";
import { TiUserDelete } from "react-icons/ti";
import { FaUser } from "react-icons/fa";

import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import AddUser from './AddUser';

function Menu() {
    const [menuComponent, setMenuComponent] = useState(null);

    if (menuComponent)
        return (
            <>
                <div className="col-md-3 mt-4 mx-auto d-grid">
                    <Button variant="outline-primary" className='' size="lg" onClick={() => { setMenuComponent(null) }}>
                        Назад
                    </Button>
                </div>
                <div className="col-md-3 mx-auto">
                    {menuComponent}
                </div>
            </>
        )


    return (
        <div className='menu col-md-4 mt-1 mx-auto'>

            <div className='menuComponent' onClick={() => { setMenuComponent(<AddUser />) }} >
                <TiUserAdd size="3em" /><br />
                Добавить <br /> пользователя
            </div>

            <div className='menuComponent' onClick={() => { setMenuComponent(<AddUser />) }} >
                <FaUserEdit size="3em" /><br />
                Редактировать <br /> пользователя
            </div>

            <div className='menuComponent' onClick={() => { setMenuComponent(<AddUser />) }} >
                <TiUserDelete size="3em" /><br />
                Удалить <br /> пользователя
            </div>

            <div className='menuComponent' onClick={() => { setMenuComponent('Профиль') }} >
                <FaUser size="3em" /><br />
                Профиль
            </div>
        </div>
    )
}

export default Menu;
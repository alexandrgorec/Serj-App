import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Button from 'react-bootstrap/Button';
import { useRef, useContext } from 'react';
import { userContext } from './App';
import { Link } from 'react-router-dom';

import Stack from 'react-bootstrap/Stack';


function AddUser({ setMenuComponent }) {
    const { setToast, aAxios } = useContext(userContext);
    const refLogin = useRef(null);
    const refPassword = useRef(null);
    const refName = useRef(null);
    const refAdmin = useRef(null);
    const refFinBlock = useRef(null);


    const addUser = () => {
        const newUser = {};
        newUser.login = refLogin.current.value;
        newUser.password = refPassword.current.value;
        newUser.userInfo = {};
        newUser.userInfo.name = refName.current.value;
        newUser.rights = {};
        newUser.rights.finBlockAccess = refFinBlock.current.checked;
        newUser.rights.adminAccess = refAdmin.current.checked;

        let allGood = true;

        if (newUser.login === '') {
            allGood = false;
            setToast("Логин не указан", 'warning')
            return;
        }

        if (newUser.login === 'root') {
            allGood = false;
            setToast("недопустимое имя", 'warning')
            return;
        }

        if (newUser.password === '') {
            allGood = false;
            setToast("Пароль не указан", 'warning')
            return;
        }

        if (newUser.userInfo.name === '') {
            allGood = false;
            setToast("Имя пользоваетля не указано", 'warning')
            return;
        }

        if (allGood) {
            aAxios.post(`/admin/adduser`, {
                newUser,
            })
                .then(function (response) {
                    if (response.status === 202) {
                        setToast(response.data);
                        setMenuComponent(null);
                    }
                    if (response.status === 203) {
                        setToast(response.data);
                    }
                })
                .catch(function (error) {

                });
        }

    }


    return (
        <>
            <Link className="col-md-3 mt-4 mx-auto d-grid nodecoration" to='/menu'>
                <Button variant="outline-primary" size="lg">
                    Назад
                </Button>
            </Link>
            <div className="col-md-3 mx-auto">
                <Stack gap={2} >
                    <br />
                    <FloatingLabel
                        label="Логин пользователя"
                        className="mb-2" >
                        <Form.Control
                            as="input"
                            type='text'
                            ref={refLogin}
                        />
                    </FloatingLabel>

                    <FloatingLabel
                        label="Пароль пользователя"
                        className="mb-2" >
                        <Form.Control
                            as="input"
                            type='text'
                            ref={refPassword}
                        />
                    </FloatingLabel>

                    <FloatingLabel
                        label="Имя пользователя"
                        className="mb-2" >
                        <Form.Control
                            as="input"
                            type='text'
                            ref={refName}
                        />
                    </FloatingLabel>


                    <Form.Check className='noselect' ref={refAdmin}
                        type="switch"
                        id="custom-switch1"
                        label="Права администратора"
                    />


                    <Form.Check className='noselect' ref={refFinBlock}
                        type="switch"
                        id="custom-switch2"
                        label="Права финансового блока"
                    />
                    <Button
                        variant="primary"
                        size='lg'
                        className='mt-3 p-3'
                        onClick={addUser}
                    >
                        Добавить пользователя
                    </Button>

                </Stack>
            </div>
        </>
    )

}

export default AddUser;
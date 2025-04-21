import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Button from 'react-bootstrap/Button';
import { Alert } from 'react-bootstrap';
import { useRef, useState } from 'react';
import axios from 'axios';
import Stack from 'react-bootstrap/Stack';

function AddUser() {
    const refLogin = useRef(null);
    const refPassword = useRef(null);
    const refName = useRef(null);
    return (
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
                className="mb-4" >
                <Form.Control
                    as="input"
                    type='text'
                    ref={refName}
                />
            </FloatingLabel>

            <Form.Check
                type="switch"
                id="custom-switch"
                label="Права администратора"
                className='mb-4'

            />

            <Form.Check
                type="switch"
                id="custom-switch"
                label="Права финансового блока"
                className='mb-4'
                
               
            />
            <Button variant="primary" size='lg'  className='mt-3'>Добавить пользователя <br/>(пока не работает)</Button>

        </Stack>
    )

}

export default AddUser;
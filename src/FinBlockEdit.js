import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { userContext } from './App';


function FinBlockEdit({ setOrder, handleCloseFinBlock, showFinBlock, order, current, suppliersOrBuyers = null }) {
    const {logOut, token, PORT} = useContext(userContext);
    const refSf = useRef(null);
    const refDate = useRef(null);
    const refSumma = useRef(null);
    const refAkt = useRef(null);
    const refReady = useRef(null);
    const index = current;

    if (suppliersOrBuyers != null)
        current = order[suppliersOrBuyers][current];

    const saveFinBlock = () => {
        setOrder((order) => {
            order[suppliersOrBuyers][index].sf = document.querySelector("#finBlock-sf").value;
            order[suppliersOrBuyers][index].date = document.querySelector("#finBlock-date").value;
            order[suppliersOrBuyers][index].summa = document.querySelector("#finBlock-summa").value;
            order[suppliersOrBuyers][index].akt = document.querySelector("#finBlock-akt").value;
            return (order);
        });
        axios.post(`http://${window.location.hostname}:${PORT}/editorder`, {
            order,
            token,
        })
            .then(function (response) {
                if (response.status === 202) {
                   
                }
            })
            .catch(function (error) {
                console.log(error);
                if (error.response.status === 999) {
                    logOut();
                  }
            })
            .finally(() => { handleCloseFinBlock() });
    }


    const nextFocus = (evt) => {
        if (evt.keyCode === 13) {
            if (evt.target.id === 'finBlock-sf')
                refDate.current.focus();
            if (evt.target.id === 'finBlock-date')
                refSumma.current.focus();
            if (evt.target.id === 'finBlock-summa')
                refAkt.current.focus();
            if (evt.target.id === 'finBlock-akt')
                refReady.current.focus();
        }
    }

    useEffect(() => {
        setTimeout(() => {
            let needFocus = document.querySelector("#finBlock-sf")
            if (needFocus !== null) {
                needFocus.focus();
                needFocus.select();
            }
        }, 100);

    })

    if (current === null)
        return;
  

    if (current?.summa === null || current?.summa === undefined) {
        current.summa = current.tons * current.price;
    }

    return (
        <Offcanvas placement='end' show={showFinBlock} onHide={() => {
            handleCloseFinBlock();
        }}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>Финансовый блок</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>

                <FloatingLabel label="С/Ф" className="mb-3" >
                    <Form.Control autoComplete="off" as="input" type='text' defaultValue={`${current.sf ? current.sf : ''}`} id="finBlock-sf" ref={refSf} onKeyUp={nextFocus} />
                </FloatingLabel>
                <FloatingLabel label="Дата" className="mb-3">
                    <Form.Control autoComplete="off" as="input" type='text' defaultValue={`${current.date ? current.date : ''}`} id="finBlock-date" ref={refDate} onKeyUp={nextFocus} />
                </FloatingLabel>
                <FloatingLabel label="Сумма" className="mb-3">
                    <Form.Control autoComplete="off" as="input" type='text' defaultValue={`${current.summa ? current.summa : ''}`} id="finBlock-summa" ref={refSumma} onKeyUp={nextFocus} />
                </FloatingLabel>
                <FloatingLabel label="Акт Транспорт" className="mb-3">
                    <Form.Control autoComplete="off" as="input" id="finBlock-akt" defaultValue={`${current.akt ? current.akt : ''}`} ref={refAkt} onKeyUp={nextFocus} />
                </FloatingLabel>
                <Button style={{ float: 'left' }} variant="danger" onClick={handleCloseFinBlock}>Отмена</Button>
                <Button style={{ float: 'right' }} variant="success" onClick={saveFinBlock} ref={refReady} >Готово</Button>
                <br /><br />
            </Offcanvas.Body>
        </Offcanvas>
    );
}


export default FinBlockEdit;
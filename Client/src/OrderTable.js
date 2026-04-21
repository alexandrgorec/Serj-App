import './OrderTable.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import NewSupplier from './NewSupplier';
import NewBuyer from './NewBuyer';
import Stack from 'react-bootstrap/Stack';
import { BiEditAlt } from "react-icons/bi";
import { useState, useContext, useRef, useEffect } from 'react';
import { MdDelete } from "react-icons/md";
import FinBlockEdit from './FinBlockEdit';
import Modal from 'react-bootstrap/Modal';
import { userContext } from './App';
import ComboBox from './ComboBox';
import TDInput from './TDInput';
import TDSumma from './TDSumma';



function OrderTable({ setOrder, order, showExternalAddButtons = false, hideInlineAddButtons = false, hideManagerInTable = false }) {
  sessionStorage.tabIndex = 0;
  const { user, size, display } = useContext(userContext);
  const [, reload] = useState(false);
  const bgColorH = 'rgba(127, 244, 166, 0.49)';


  // const [litersForSale, setLiterForSale] = useState({});
  // const handleRefreshLitersForSale = () => {
  //   let result = {};
  //   order.suppliers.forEach((elem) => {
  //     result[elem.typeOfProduct] = (result[elem.typeOfProduct] || 0) + (+elem.liters);
  //   })
  //   order.buyers.forEach((elem) => {
  //     result[elem.typeOfProduct] = (result[elem.typeOfProduct] || 0) - (+elem.liters);
  //   })
  //   setLiterForSale(() => { return result });
  // }

  if (order.manager === undefined) {
    if (order.buyers.length > 0)
      if (order.buyers[0].manager != undefined)
        order.manager = order.buyers[0].manager;
      else
        order.manager = '';
  }



  const [summaKeys, setSummaKeys] = useState({});
  const triggerSummaCalc = (index) => {
    setSummaKeys(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
  };

  const [buyerSummaKeys, setBuyerSummaKeys] = useState({});
  const triggerBuyerSummaCalc = (index) => {
    setBuyerSummaKeys(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
  };

  const [buyerHSummaKeys, setBuyerHSummaKeys] = useState({});
  const triggerBuyerHSummaCalc = (index, indexBuyerH) => {
    const key = `${index}-${indexBuyerH}`;
    setBuyerHSummaKeys(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  };

  const [deleteElement, setDeleteElement] = useState(null);
  const [show, setShow] = useState(false);
  const handleCloseModal = () => setShow(false);
  const handleShowModal = () => setShow(true);
  const rowKeyMapRef = useRef(new WeakMap());
  const rowKeyCounterRef = useRef(0);

  const getRowKey = (row, prefix, fallback) => {
    if (!row || typeof row !== 'object') return `${prefix}-${fallback}`;
    const map = rowKeyMapRef.current;
    if (!map.has(row)) {
      rowKeyCounterRef.current += 1;
      map.set(row, `${prefix}-${rowKeyCounterRef.current}`);
    }
    return map.get(row);
  };

  const addSupplier = () => {
    setOrder(orderHandle => {
      orderHandle.suppliers.push({
        liters: '',
        name: '',
        price: '',
        tons: '',
        typeOfProduct: '',
      })
      return ({ ...orderHandle })
    })
  };

  const addBuyer = () => {
    setOrder(orderHandle => {
      orderHandle.buyers.push({
        liters: '',
        name: '',
        price: '',
        tons: '',
        typeOfProduct: '',
      })
      return ({ ...orderHandle })
    })
  };

  const useExternalAddLayout = showExternalAddButtons || hideInlineAddButtons;

  const handleDeleteConfirmed = () => {
    if (!deleteElement) return;

    if (deleteElement.element !== 'buyerH') {
      setOrder((prevOrder) => {
        const nextOrder = { ...prevOrder };
        const list = [...(nextOrder[deleteElement.element] || [])];
        const removeIndex = deleteElement.item
          ? list.findIndex((item) => item === deleteElement.item)
          : deleteElement.index;
        if (removeIndex > -1) list.splice(removeIndex, 1);
        nextOrder[deleteElement.element] = list;
        return nextOrder;
      });
    }
    if (deleteElement.element === 'buyerH') {
      setOrder((prevOrder) => {
        const nextOrder = { ...prevOrder };
        nextOrder.buyers = [...(nextOrder.buyers || [])];
        const nextBuyer = { ...(nextOrder.buyers[deleteElement.index] || {}) };
        const buyerHList = [...(nextBuyer.buyersH || [])];
        const removeIndex = deleteElement.item
          ? buyerHList.findIndex((item) => item === deleteElement.item)
          : deleteElement.indexBuyerH;
        if (removeIndex > -1) buyerHList.splice(removeIndex, 1);
        nextBuyer.buyersH = buyerHList;
        nextOrder.buyers[deleteElement.index] = nextBuyer;
        return nextOrder;
      });
    }
    setDeleteElement(null);
    reload((prev) => !prev);
    handleCloseModal();
  };

  const handleModalKeyDown = (evt) => {
    if (evt.key === 'Escape') {
      evt.preventDefault();
      handleCloseModal();
      return;
    }
    if (evt.key === 'Enter') {
      evt.preventDefault();
      handleDeleteConfirmed();
    }
  };

  useEffect(() => {
    if (!show) return undefined;

    const handleGlobalModalKeyDown = (evt) => {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        evt.stopPropagation();
        handleCloseModal();
        return;
      }
      if (evt.key === 'Enter') {
        evt.preventDefault();
        evt.stopPropagation();
        handleDeleteConfirmed();
      }
    };

    document.addEventListener('keydown', handleGlobalModalKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleGlobalModalKeyDown, true);
    };
  }, [show, deleteElement]);


  return (
    <>
      <div className='noselect'>
        {showExternalAddButtons &&
          <Stack direction='horizontal' gap={2} className='orderTable-topActions'>
            <Button variant="primary" size={size} onClick={addSupplier}>Добавить поставщика</Button>
            <Button variant="success" size={size} onClick={addBuyer}>Добавить покупателя</Button>
          </Stack>
        }
        <Table className='orderTable-main' striped bordered hover responsive="sm">
          <thead>
            <tr>
              {useExternalAddLayout
                ? <th colSpan={2} className='orderTable-head-supplier'>Поставщик</th>
                : <>
                    <th width='1%'>
                      <Button tabIndex={-1} variant="primary" size={size} className='col-12' onClick={addSupplier}>+</Button>
                    </th>
                    <th width='16%'>Поставщик </th>
                  </>
              }
              <th width='18%'>Вид продукта</th>
              <th width='6%'>Литры</th>
              <th width='6%'>Тонны</th>
              <th width='6%'>Цена</th>
              {user.rights.finBlockAccess &&
                <>
                  <th width='6%' style={{ display: display }}>С/Ф</th>
                  <th width='1%' style={{ display: display }} className='th-date'>Дата</th>
                  <th width='8%' style={{ display: display }} className='th-summa'>Сумма</th>
                  <th width='5%' style={{ display: display }} className='th-akt'>Акт транспорт</th>
                </>
              }
            </tr>
          </thead>
          <tbody>
            {order.suppliers.map((supplier, index) => {
              return (
                <tr key={getRowKey(supplier, 'supplier', index)} className='suppliers-tr'>
                  <td className='orderTable-col-actions p-0 pt-1 pr-1'>
                    <Stack direction='horizontal'>
                      <MdDelete size='1.7em' className='icon ms-auto' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                        setDeleteElement({
                          element: 'suppliers',
                          index,
                          item: supplier,
                        })
                        handleShowModal();
                      }}
                      />
                    </Stack>
                  </td>
                  <td className='m-0 p-0 orderTable-col-supplier' >
                    <ComboBox object={supplier} nameDataList={'SUPPLIERS'} field={'name'}/>
                  </td>
                  <td className='m-0 p-0'                   >
                    <ComboBox object={supplier} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
                  </td>
                  <TDInput object={supplier} field={'liters'} type={'number'} onChangeExtra={() => triggerSummaCalc(index)} />
                  <TDInput object={supplier} field={'tons'} type={'number'} onChangeExtra={() => triggerSummaCalc(index)} />
                  <TDInput object={supplier} field={'price'} type={'number'} onChangeExtra={() => triggerSummaCalc(index)} />
                  {user.rights.finBlockAccess &&
                    <>
                      <TDInput object={supplier} field={'sf'} type={'text'} display={display} />
                      <TDInput object={order} field={'date'} type={'date'} disabled={true} value={true} display={display} tdClassName="td-date" inputClassName="date-input" fontSize="12px" />
                      <TDSumma object={supplier} field={'summa'} display={display} calcTrigger={summaKeys[index] || 0} />
                      <TDInput object={supplier} field={'akt'} type={'text'} display={display}/>
                    </>
                  }

                </tr>
              )
            })}

          </tbody>
          <thead>
            <tr>
              {useExternalAddLayout
                ? <th colSpan={4}>
                    <Stack gap={2} direction='horizontal'>Покупатель</Stack>
                  </th>
                : <>
                    <th>
                      <Button tabIndex={-1} variant="primary" className='col-12' size={size} onClick={addBuyer}>+</Button>
                    </th>
                    <th colSpan={3}>
                      <Stack gap={2} direction='horizontal'>Покупатель</Stack>
                    </th>
                  </>
              }
              {hideManagerInTable
                ? <th colSpan={2}></th>
                : <>
                    <th style={{ borderRight: 'none', textAlign: 'right' }}  >Менеджер:  </th>
                    <TDInput object={order} field={'manager'} type={'text'} fontSize='12px'/>
                  </>
              }
              {user.rights.finBlockAccess &&
                <>
                  <th style={{ display: display }} colSpan={3}></th>
                  <th style={{ display: display }}></th>
                </>}

            </tr>
          </thead>
          <tbody>
            {order.buyers.map((buyer, index) => {
              return (
                <>

                  <tr key={getRowKey(buyer, 'buyer', index)} className='buyers-tr' style={{ borderTop: '2px solid pink' }}>
                    <td className='orderTable-col-actions p-0 pt-1 pr-1'>
                      <Stack gap={1} direction='horizontal' >
                        <Button className='m-1 mt-0 mb-0 p-2 pt-0 pb-0 ' tabIndex={-1} variant="warning" style={{ backgroundColor: buyer.buyersH?.length > 0 ? bgColorH : '' }} onClick={() => {
                          const orderSave = order;
                          orderSave.buyers[index].buyersH = orderSave.buyers[index].buyersH || [];
                          const copyBuyer = { ...orderSave.buyers[index] };
                          delete copyBuyer.buyersH;
                          copyBuyer.name = '';
                          orderSave.buyers[index].buyersH.push(copyBuyer);
                          setOrder({ ...orderSave });

                        }}>н</Button>
                        <MdDelete size='1.7em' className='icon' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                          setDeleteElement({
                            element: 'buyers',
                            index,
                            item: buyer,
                          })
                          handleShowModal();
                        }}
                        />

                      </Stack>
                    </td>
                    <td className='m-0 p-0'  >
                      <ComboBox object={buyer} nameDataList={'BUYERS'} field={'name'} />
                    </td>
                    <td className='m-0 p-0' >
                      <ComboBox object={buyer} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
                    </td>
                    <TDInput object={buyer} field={'liters'} type={'number'} onChangeExtra={() => triggerBuyerSummaCalc(index)} />
                    <TDInput object={buyer} field={'tons'} type={'number'} onChangeExtra={() => triggerBuyerSummaCalc(index)} />
                    <TDInput object={buyer} field={'price'} type={'number'} onChangeExtra={() => triggerBuyerSummaCalc(index)} />
                    {user.rights.finBlockAccess &&
                      <>
                        <TDInput object={buyer} field={'sf'} type={'text'} display={display} />
                        <TDInput object={order} field={'date'} type={'date'} disabled={true} value={true} display={display} tdClassName="td-date" inputClassName="date-input" fontSize="12px" />
                        <TDSumma object={buyer} field={'summa'} display={display} calcTrigger={buyerSummaKeys[index] || 0} />
                        <TDInput object={buyer} field={'akt'} type={'number'} display={display} />
                      </>
                    }
                  </tr>
                  {
                    buyer.buyersH && buyer.buyersH.map((buyerH, indexBuyerH, arr) => {
                      return (
                        <tr key={getRowKey(buyerH, `buyerH-${index}`, `${index}-${indexBuyerH}`)} className={`buyersH-tr-${index}`}>
                          <td style={{ backgroundColor: bgColorH }} className='orderTable-col-actions p-0 pt-1'>
                            <Stack gap={1} direction='horizontal'>
                              <MdDelete size='1.7em' className='icon ms-auto' style={{ color: 'rgb(194, 65, 65)' }} onClick={() => {
                                setDeleteElement({
                                  element: 'buyerH',
                                  index,
                                  indexBuyerH: indexBuyerH,
                                  item: buyerH,
                                })
                                handleShowModal();
                              }}
                              />
                            </Stack>
                          </td>
                          <td className='m-0 p-0'  >
                            <ComboBox object={buyerH} nameDataList={'BUYERS'} field={'name'} isBuyerH={'buyerH'} />
                          </td>
                          <td className='m-0 p-0' >
                            <ComboBox object={buyerH} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
                          </td>
                          <TDInput object={buyerH} field={'liters'} type={'number'} onChangeExtra={() => triggerBuyerHSummaCalc(index, indexBuyerH)} />
                          <TDInput object={buyerH} field={'tons'} type={'number'} onChangeExtra={() => triggerBuyerHSummaCalc(index, indexBuyerH)} />
                          <TDInput object={buyerH} field={'price'} type={'number'} onChangeExtra={() => triggerBuyerHSummaCalc(index, indexBuyerH)} />
                          {user.rights.finBlockAccess &&
                            <>
                              <TDInput object={buyerH} field={'sf'} type={'text'} display={display} />
                              <TDInput object={order} field={'date'} type={'date'} disabled={true} display={display} tdClassName="td-date" inputClassName="date-input" fontSize="12px" />
                              <TDSumma object={buyerH} field={'summa'} display={display} calcTrigger={buyerHSummaKeys[`${index}-${indexBuyerH}`] || 0} />
                              <TDInput object={buyerH} field={'akt'} type={'number'} display={display} />
                            </>
                          }

                        </tr>


                      )
                    }
                    )}
                  <tr style={{ border: "2px solid pink" }}></tr>
                </>
              )
            })}
          </tbody>
        </Table>
      </div>
      <Modal centered show={show} onHide={handleCloseModal} animation={true} onKeyDown={handleModalKeyDown}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления</Modal.Title>
        </Modal.Header>
        <Modal.Body>Точно удаляем?</Modal.Body>
        <Modal.Footer>

          <Button variant="secondary" onClick={handleCloseModal}>
            Еще подумаю
          </Button>
          <Button variant="primary" className='col-3' onClick={handleDeleteConfirmed}>
            Да
          </Button>

        </Modal.Footer>
      </Modal>

    </>
  );
}


export default OrderTable;

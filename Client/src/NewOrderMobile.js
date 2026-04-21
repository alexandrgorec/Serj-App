import './NewOrderMobile.css';
import { useContext, useState } from 'react';
import { userContext } from './App';
import ComboBox from './ComboBox';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import { MdDelete } from "react-icons/md";

function NewOrderMobile({ order, setOrder }) {
  const { user } = useContext(userContext);
  const bgColorH = 'rgba(127, 244, 166, 0.22)';

  const [deleteElement, setDeleteElement] = useState(null);
  const [show, setShow] = useState(false);
  const handleCloseModal = () => setShow(false);
  const handleShowModal = () => setShow(true);

  const refresh = () => {
    setOrder({ ...order });
  };

  const formatPreserveFraction = (raw) => {
    if (raw === undefined || raw === null) return '';
    let s = String(raw).trim();
    if (s === '') return '';

    const hadComma = s.includes(',');
    s = s.replace(/\s/g, '').replace(/,/g, '.');

    const sign = s.startsWith('-') ? '-' : '';
    if (sign) s = s.slice(1);

    const parts = s.split('.');
    const intRaw = parts[0];
    const fracRaw = parts[1];
    if (!intRaw || !/^\d+$/.test(intRaw)) return '';

    const intFormatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(intRaw));
    if (fracRaw === undefined) return sign + intFormatted;
    if (!/^\d+$/.test(fracRaw)) return sign + intFormatted;

    return sign + intFormatted + (hadComma ? ',' : '.') + fracRaw;
  };

  const parseNumeric = (raw) => {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).replace(/\s/g, '').replace(/,/g, '.').trim();
    if (s === '' || s === '-') return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  };

  const calculateSumma = (target, preferredMode = null) => {
    const mode = preferredMode || target.summaMode || 'liters';
    target.summaMode = mode;
    const amount = parseNumeric(mode === 'tons' ? target.tons : target.liters);
    const price = parseNumeric(target.price);
    if (amount === null || price === null) {
      target.summa = '';
      refresh();
      return;
    }
    const product = amount * price;
    let raw = String(product);
    if (raw.includes('e') || raw.includes('E'))
      raw = product.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    target.summa = formatPreserveFraction(raw);
    refresh();
  };

  const addSupplier = () => {
    setOrder((prev) => ({
      ...prev,
      suppliers: [
        ...(prev.suppliers || []),
        { liters: '', name: '', price: '', tons: '', typeOfProduct: '' },
      ],
    }));
  };

  const addBuyer = () => {
    setOrder((prev) => ({
      ...prev,
      buyers: [
        ...(prev.buyers || []),
        { liters: '', name: '', price: '', tons: '', typeOfProduct: '' },
      ],
    }));
  };

  const addBuyerH = (buyerIndex) => {
    const next = { ...order };
    next.buyers = [...(next.buyers || [])];
    const buyer = { ...next.buyers[buyerIndex] };
    buyer.buyersH = [...(buyer.buyersH || [])];
    const copyBuyer = { ...buyer };
    delete copyBuyer.buyersH;
    copyBuyer.name = '';
    buyer.buyersH.push(copyBuyer);
    next.buyers[buyerIndex] = buyer;
    setOrder(next);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteElement) return;

    if (deleteElement.element !== 'buyerH') {
      setOrder((prev) => {
        const next = { ...prev };
        next[deleteElement.element] = (next[deleteElement.element] || [])
          .filter((item, ind) => ind !== deleteElement.index);
        return next;
      });
    }

    if (deleteElement.element === 'buyerH') {
      setOrder((prev) => {
        const next = { ...prev };
        next.buyers = [...(next.buyers || [])];
        const buyer = { ...next.buyers[deleteElement.index] };
        buyer.buyersH = (buyer.buyersH || []).filter((item, ind) => ind !== deleteElement.indexBuyerH);
        next.buyers[deleteElement.index] = buyer;
        return next;
      });
    }

    setDeleteElement(null);
    handleCloseModal();
  };

  const NumberInput = ({ target, field, placeholder = '' }) => (
    <Form.Control
      type='text'
      inputMode='decimal'
      value={target?.[field] || ''}
      placeholder={placeholder}
      onChange={(evt) => {
        target[field] = evt.target.value;
        refresh();
      }}
      onBlur={() => {
        target[field] = formatPreserveFraction(target[field]);
        refresh();
      }}
    />
  );

  return (
    <>
      <div className='orderMobile noselect'>
        <Stack direction='horizontal' gap={2} className='orderMobile-topActions'>
          <Button size='sm' variant='primary' onClick={addSupplier}>Добавить поставщика</Button>
          <Button size='sm' variant='success' onClick={addBuyer}>Добавить покупателя</Button>
        </Stack>

        <div className='orderMobile-section'>
          <Stack direction='horizontal' className='orderMobile-sectionHeader'>
            <div className='orderMobile-sectionTitle'>Поставщики</div>
          </Stack>

          {(order.suppliers || []).map((supplier, index) => (
            <div className='orderMobile-card' key={`supplier-${index}`}>
              <Stack direction='horizontal' className='orderMobile-cardHeader'>
                <strong className='orderMobile-cardTitle'>Поставщик #{index + 1}</strong>
                <div className='orderMobile-cardActions'>
                  <MdDelete
                    size='1.4em'
                    className='icon'
                    style={{ color: 'rgb(194, 65, 65)' }}
                    onClick={() => {
                      setDeleteElement({ element: 'suppliers', index });
                      handleShowModal();
                    }}
                  />
                </div>
              </Stack>

              <div className='orderMobile-field'>
                <div className='orderMobile-label'>Поставщик</div>
                <ComboBox object={supplier} nameDataList={'SUPPLIERS'} field={'name'} />
              </div>
              <div className='orderMobile-field'>
                <div className='orderMobile-label'>Вид продукта</div>
                <ComboBox object={supplier} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
              </div>

              <div className='orderMobile-grid3'>
                <div className='orderMobile-field'>
                  <div className='orderMobile-label'>Литры</div>
                  <NumberInput target={supplier} field='liters' />
                </div>
                <div className='orderMobile-field'>
                  <div className='orderMobile-label'>Тонны</div>
                  <NumberInput target={supplier} field='tons' />
                </div>
                <div className='orderMobile-field'>
                  <div className='orderMobile-label'>Цена</div>
                  <NumberInput target={supplier} field='price' />
                </div>
              </div>

              {user.rights.finBlockAccess &&
                <>
                  <div className='orderMobile-grid2'>
                    <div className='orderMobile-field'>
                      <div className='orderMobile-label'>С/Ф</div>
                      <Form.Control
                        type='text'
                        value={supplier.sf || ''}
                        onChange={(evt) => {
                          supplier.sf = evt.target.value;
                          refresh();
                        }}
                      />
                    </div>
                    <div className='orderMobile-field'>
                      <div className='orderMobile-label'>Акт транспорт</div>
                      <Form.Control
                        type='text'
                        value={supplier.akt || ''}
                        onChange={(evt) => {
                          supplier.akt = evt.target.value;
                          refresh();
                        }}
                      />
                    </div>
                  </div>
                  <div className='orderMobile-field'>
                    <div className='orderMobile-label'>Сумма</div>
                    <InputGroup>
                      <Form.Control
                        type='text'
                        inputMode='decimal'
                        value={supplier.summa || ''}
                        onChange={(evt) => {
                          supplier.summa = evt.target.value;
                          refresh();
                        }}
                        onBlur={() => {
                          supplier.summa = formatPreserveFraction(supplier.summa);
                          refresh();
                        }}
                      />
                      <Button
                        variant={supplier.summaMode === 'tons' ? 'warning' : 'info'}
                        onClick={() => {
                          const mode = supplier.summaMode === 'tons' ? 'liters' : 'tons';
                          calculateSumma(supplier, mode);
                        }}
                      >
                        {supplier.summaMode === 'tons' ? 'ТхЦ' : 'ЛхЦ'}
                      </Button>
                    </InputGroup>
                  </div>
                </>
              }
            </div>
          ))}
        </div>

        <div className='orderMobile-section'>
          <Stack direction='horizontal' className='orderMobile-sectionHeader'>
            <div className='orderMobile-sectionTitle'>Покупатели</div>
          </Stack>

          {(order.buyers || []).map((buyer, index) => (
            <div className='orderMobile-card' key={`buyer-${index}`}>
              <Stack direction='horizontal' className='orderMobile-cardHeader'>
                <strong className='orderMobile-cardTitle'>Покупатель #{index + 1}</strong>
                <div className='orderMobile-cardActions'>
                  <Button
                    size='sm'
                    variant='warning'
                    className='orderMobile-hBtn'
                    style={{ backgroundColor: buyer.buyersH?.length > 0 ? bgColorH : '' }}
                    onClick={() => addBuyerH(index)}
                  >
                    н
                  </Button>
                  <MdDelete
                    size='1.4em'
                    className='icon'
                    style={{ color: 'rgb(194, 65, 65)' }}
                    onClick={() => {
                      setDeleteElement({ element: 'buyers', index });
                      handleShowModal();
                    }}
                  />
                </div>
              </Stack>

              <div className='orderMobile-field'>
                <div className='orderMobile-label'>Покупатель</div>
                <ComboBox object={buyer} nameDataList={'BUYERS'} field={'name'} />
              </div>
              <div className='orderMobile-field'>
                <div className='orderMobile-label'>Вид продукта</div>
                <ComboBox object={buyer} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
              </div>

              <div className='orderMobile-grid3'>
                <div className='orderMobile-field'>
                  <div className='orderMobile-label'>Литры</div>
                  <NumberInput target={buyer} field='liters' />
                </div>
                <div className='orderMobile-field'>
                  <div className='orderMobile-label'>Тонны</div>
                  <NumberInput target={buyer} field='tons' />
                </div>
                <div className='orderMobile-field'>
                  <div className='orderMobile-label'>Цена</div>
                  <NumberInput target={buyer} field='price' />
                </div>
              </div>

              {user.rights.finBlockAccess &&
                <>
                  <div className='orderMobile-grid2'>
                    <div className='orderMobile-field'>
                      <div className='orderMobile-label'>С/Ф</div>
                      <Form.Control
                        type='text'
                        value={buyer.sf || ''}
                        onChange={(evt) => {
                          buyer.sf = evt.target.value;
                          refresh();
                        }}
                      />
                    </div>
                    <div className='orderMobile-field'>
                      <div className='orderMobile-label'>Акт транспорт</div>
                      <Form.Control
                        type='text'
                        value={buyer.akt || ''}
                        onChange={(evt) => {
                          buyer.akt = evt.target.value;
                          refresh();
                        }}
                      />
                    </div>
                  </div>
                  <div className='orderMobile-field'>
                    <div className='orderMobile-label'>Сумма</div>
                    <InputGroup>
                      <Form.Control
                        type='text'
                        inputMode='decimal'
                        value={buyer.summa || ''}
                        onChange={(evt) => {
                          buyer.summa = evt.target.value;
                          refresh();
                        }}
                        onBlur={() => {
                          buyer.summa = formatPreserveFraction(buyer.summa);
                          refresh();
                        }}
                      />
                      <Button
                        variant={buyer.summaMode === 'tons' ? 'warning' : 'info'}
                        onClick={() => {
                          const mode = buyer.summaMode === 'tons' ? 'liters' : 'tons';
                          calculateSumma(buyer, mode);
                        }}
                      >
                        {buyer.summaMode === 'tons' ? 'ТхЦ' : 'ЛхЦ'}
                      </Button>
                    </InputGroup>
                  </div>
                </>
              }

              {(buyer.buyersH || []).map((buyerH, indexBuyerH) => (
                <div className='orderMobile-subCard' key={`buyerH-${index}-${indexBuyerH}`} style={{ backgroundColor: bgColorH }}>
                  <Stack direction='horizontal' className='orderMobile-cardHeader'>
                    <strong className='orderMobile-cardTitle'>Подпокупатель #{indexBuyerH + 1}</strong>
                    <div className='orderMobile-cardActions'>
                      <MdDelete
                        size='1.35em'
                        className='icon'
                        style={{ color: 'rgb(194, 65, 65)' }}
                        onClick={() => {
                          setDeleteElement({ element: 'buyerH', index, indexBuyerH });
                          handleShowModal();
                        }}
                      />
                    </div>
                  </Stack>

                  <div className='orderMobile-field'>
                    <div className='orderMobile-label'>Подпокупатель</div>
                    <ComboBox object={buyerH} nameDataList={'BUYERS'} field={'name'} isBuyerH={'buyerH'} />
                  </div>
                  <div className='orderMobile-field'>
                    <div className='orderMobile-label'>Вид продукта</div>
                    <ComboBox object={buyerH} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
                  </div>

                  <div className='orderMobile-grid3'>
                    <div className='orderMobile-field'>
                      <div className='orderMobile-label'>Литры</div>
                      <NumberInput target={buyerH} field='liters' />
                    </div>
                    <div className='orderMobile-field'>
                      <div className='orderMobile-label'>Тонны</div>
                      <NumberInput target={buyerH} field='tons' />
                    </div>
                    <div className='orderMobile-field'>
                      <div className='orderMobile-label'>Цена</div>
                      <NumberInput target={buyerH} field='price' />
                    </div>
                  </div>

                  {user.rights.finBlockAccess &&
                    <>
                      <div className='orderMobile-grid2'>
                        <div className='orderMobile-field'>
                          <div className='orderMobile-label'>С/Ф</div>
                          <Form.Control
                            type='text'
                            value={buyerH.sf || ''}
                            onChange={(evt) => {
                              buyerH.sf = evt.target.value;
                              refresh();
                            }}
                          />
                        </div>
                        <div className='orderMobile-field'>
                          <div className='orderMobile-label'>Акт транспорт</div>
                          <Form.Control
                            type='text'
                            value={buyerH.akt || ''}
                            onChange={(evt) => {
                              buyerH.akt = evt.target.value;
                              refresh();
                            }}
                          />
                        </div>
                      </div>
                      <div className='orderMobile-field'>
                        <div className='orderMobile-label'>Сумма</div>
                        <InputGroup>
                          <Form.Control
                            type='text'
                            inputMode='decimal'
                            value={buyerH.summa || ''}
                            onChange={(evt) => {
                              buyerH.summa = evt.target.value;
                              refresh();
                            }}
                            onBlur={() => {
                              buyerH.summa = formatPreserveFraction(buyerH.summa);
                              refresh();
                            }}
                          />
                          <Button
                            variant={buyerH.summaMode === 'tons' ? 'warning' : 'info'}
                            onClick={() => {
                              const mode = buyerH.summaMode === 'tons' ? 'liters' : 'tons';
                              calculateSumma(buyerH, mode);
                            }}
                          >
                            {buyerH.summaMode === 'tons' ? 'ТхЦ' : 'ЛхЦ'}
                          </Button>
                        </InputGroup>
                      </div>
                    </>
                  }
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className='orderMobile-mainFields'>
          <div className='orderMobile-field'>
            <div className='orderMobile-label'>Дата</div>
            <Form.Control as='input' type='date' value={order.date || ''} disabled />
          </div>
          <div className='orderMobile-field'>
            <div className='orderMobile-label'>Менеджер</div>
            <Form.Control
              as='input'
              type='text'
              value={order.manager || ''}
              onChange={(evt) => {
                order.manager = evt.target.value;
                refresh();
              }}
            />
          </div>
        </div>
      </div>

      <Modal centered show={show} onHide={handleCloseModal} animation={true} >
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

export default NewOrderMobile;

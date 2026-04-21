import './EditOrderMobile.css';
import { useContext, useState, useRef } from 'react';
import { userContext } from './App';
import ComboBox from './ComboBox';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import { MdDelete } from "react-icons/md";

function EditOrderMobile({ order, setOrder, onSave, onBack, cost, setCost }) {
  const { user } = useContext(userContext);
  const bgColorH = 'rgba(127, 244, 166, 0.22)';

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
        const list = [...(next[deleteElement.element] || [])];
        const removeIndex = deleteElement.item
          ? list.findIndex((item) => item === deleteElement.item)
          : deleteElement.index;
        if (removeIndex > -1) list.splice(removeIndex, 1);
        next[deleteElement.element] = list;
        return next;
      });
    }

    if (deleteElement.element === 'buyerH') {
      setOrder((prev) => {
        const next = { ...prev };
        next.buyers = [...(next.buyers || [])];
        const buyer = { ...next.buyers[deleteElement.index] };
        const buyerHList = [...(buyer.buyersH || [])];
        const removeIndex = deleteElement.item
          ? buyerHList.findIndex((item) => item === deleteElement.item)
          : deleteElement.indexBuyerH;
        if (removeIndex > -1) buyerHList.splice(removeIndex, 1);
        buyer.buyersH = buyerHList;
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
      <div className='editOrderMobile noselect'>
        <Stack direction='horizontal' gap={2} className='editOrderMobile-topBar'>
          <div className='editOrderMobile-orderId'>Заявка № {order.id}</div>
          <div className='editOrderMobile-dateWrap'>
            <Form.Control
              as='input'
              type='date'
              value={order.date || ''}
              onChange={(evt) => {
                order.date = evt.target.value;
                refresh();
              }}
            />
          </div>
          <Button size='sm' variant='primary' onClick={onBack}>Назад</Button>
          <Button size='sm' variant='success' onClick={onSave}>Сохранить</Button>
        </Stack>

        <Stack direction='horizontal' gap={2} className='editOrderMobile-topActions'>
          <Button size='sm' variant='primary' onClick={addSupplier}>Добавить поставщика</Button>
          <Button size='sm' variant='success' onClick={addBuyer}>Добавить покупателя</Button>
        </Stack>

        <div className='editOrderMobile-section'>
          <Stack direction='horizontal' className='editOrderMobile-sectionHeader'>
            <div className='editOrderMobile-sectionTitle'>Поставщики</div>
          </Stack>

          {(order.suppliers || []).map((supplier, index) => (
            <div className='editOrderMobile-card' key={getRowKey(supplier, 'supplier', index)}>
              <Stack direction='horizontal' className='editOrderMobile-cardHeader'>
                <strong className='editOrderMobile-cardTitle'>Поставщик #{index + 1}</strong>
                <div className='editOrderMobile-cardActions'>
                  <MdDelete
                    size='1.4em'
                    className='icon'
                    style={{ color: 'rgb(194, 65, 65)' }}
                    onClick={() => {
                      setDeleteElement({ element: 'suppliers', index, item: supplier });
                      handleShowModal();
                    }}
                  />
                </div>
              </Stack>

              <div className='editOrderMobile-field'>
                <div className='editOrderMobile-label'>Поставщик</div>
                <ComboBox object={supplier} nameDataList={'SUPPLIERS'} field={'name'} />
              </div>
              <div className='editOrderMobile-field'>
                <div className='editOrderMobile-label'>Вид продукта</div>
                <ComboBox object={supplier} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
              </div>

              <div className='editOrderMobile-grid3'>
                <div className='editOrderMobile-field'>
                  <div className='editOrderMobile-label'>Литры</div>
                  <NumberInput target={supplier} field='liters' />
                </div>
                <div className='editOrderMobile-field'>
                  <div className='editOrderMobile-label'>Тонны</div>
                  <NumberInput target={supplier} field='tons' />
                </div>
                <div className='editOrderMobile-field'>
                  <div className='editOrderMobile-label'>Цена</div>
                  <NumberInput target={supplier} field='price' />
                </div>
              </div>

              {user.rights.finBlockAccess &&
                <>
                  <div className='editOrderMobile-grid2'>
                    <div className='editOrderMobile-field'>
                      <div className='editOrderMobile-label'>С/Ф</div>
                      <Form.Control
                        type='text'
                        value={supplier.sf || ''}
                        onChange={(evt) => {
                          supplier.sf = evt.target.value;
                          refresh();
                        }}
                      />
                    </div>
                    <div className='editOrderMobile-field'>
                      <div className='editOrderMobile-label'>Акт транспорт</div>
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
                  <div className='editOrderMobile-field'>
                    <div className='editOrderMobile-label'>Сумма</div>
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

        <div className='editOrderMobile-section'>
          <Stack direction='horizontal' className='editOrderMobile-sectionHeader'>
            <div className='editOrderMobile-sectionTitle'>Покупатели</div>
          </Stack>

          {(order.buyers || []).map((buyer, index) => (
            <div className='editOrderMobile-card' key={getRowKey(buyer, 'buyer', index)}>
              <Stack direction='horizontal' className='editOrderMobile-cardHeader'>
                <strong className='editOrderMobile-cardTitle'>Покупатель #{index + 1}</strong>
                <div className='editOrderMobile-cardActions'>
                  <Button
                    size='sm'
                    variant='warning'
                    className='editOrderMobile-hBtn'
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
                      setDeleteElement({ element: 'buyers', index, item: buyer });
                      handleShowModal();
                    }}
                  />
                </div>
              </Stack>

              <div className='editOrderMobile-field'>
                <div className='editOrderMobile-label'>Покупатель</div>
                <ComboBox object={buyer} nameDataList={'BUYERS'} field={'name'} />
              </div>
              <div className='editOrderMobile-field'>
                <div className='editOrderMobile-label'>Вид продукта</div>
                <ComboBox object={buyer} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
              </div>

              <div className='editOrderMobile-grid3'>
                <div className='editOrderMobile-field'>
                  <div className='editOrderMobile-label'>Литры</div>
                  <NumberInput target={buyer} field='liters' />
                </div>
                <div className='editOrderMobile-field'>
                  <div className='editOrderMobile-label'>Тонны</div>
                  <NumberInput target={buyer} field='tons' />
                </div>
                <div className='editOrderMobile-field'>
                  <div className='editOrderMobile-label'>Цена</div>
                  <NumberInput target={buyer} field='price' />
                </div>
              </div>

              {user.rights.finBlockAccess &&
                <>
                  <div className='editOrderMobile-grid2'>
                    <div className='editOrderMobile-field'>
                      <div className='editOrderMobile-label'>С/Ф</div>
                      <Form.Control
                        type='text'
                        value={buyer.sf || ''}
                        onChange={(evt) => {
                          buyer.sf = evt.target.value;
                          refresh();
                        }}
                      />
                    </div>
                    <div className='editOrderMobile-field'>
                      <div className='editOrderMobile-label'>Акт транспорт</div>
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
                  <div className='editOrderMobile-field'>
                    <div className='editOrderMobile-label'>Сумма</div>
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
                <div className='editOrderMobile-subCard' key={getRowKey(buyerH, `buyerH-${index}`, `${index}-${indexBuyerH}`)} style={{ backgroundColor: bgColorH }}>
                  <Stack direction='horizontal' className='editOrderMobile-cardHeader'>
                    <strong className='editOrderMobile-cardTitle'>Подпокупатель #{indexBuyerH + 1}</strong>
                    <div className='editOrderMobile-cardActions'>
                      <MdDelete
                        size='1.35em'
                        className='icon'
                        style={{ color: 'rgb(194, 65, 65)' }}
                        onClick={() => {
                          setDeleteElement({ element: 'buyerH', index, indexBuyerH, item: buyerH });
                          handleShowModal();
                        }}
                      />
                    </div>
                  </Stack>

                  <div className='editOrderMobile-field'>
                    <div className='editOrderMobile-label'>Подпокупатель</div>
                    <ComboBox object={buyerH} nameDataList={'BUYERS'} field={'name'} isBuyerH={'buyerH'} />
                  </div>
                  <div className='editOrderMobile-field'>
                    <div className='editOrderMobile-label'>Вид продукта</div>
                    <ComboBox object={buyerH} nameDataList={'TYPE_OF_PRODUCT'} field={'typeOfProduct'} />
                  </div>

                  <div className='editOrderMobile-grid3'>
                    <div className='editOrderMobile-field'>
                      <div className='editOrderMobile-label'>Литры</div>
                      <NumberInput target={buyerH} field='liters' />
                    </div>
                    <div className='editOrderMobile-field'>
                      <div className='editOrderMobile-label'>Тонны</div>
                      <NumberInput target={buyerH} field='tons' />
                    </div>
                    <div className='editOrderMobile-field'>
                      <div className='editOrderMobile-label'>Цена</div>
                      <NumberInput target={buyerH} field='price' />
                    </div>
                  </div>

                  {user.rights.finBlockAccess &&
                    <>
                      <div className='editOrderMobile-grid2'>
                        <div className='editOrderMobile-field'>
                          <div className='editOrderMobile-label'>С/Ф</div>
                          <Form.Control
                            type='text'
                            value={buyerH.sf || ''}
                            onChange={(evt) => {
                              buyerH.sf = evt.target.value;
                              refresh();
                            }}
                          />
                        </div>
                        <div className='editOrderMobile-field'>
                          <div className='editOrderMobile-label'>Акт транспорт</div>
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
                      <div className='editOrderMobile-field'>
                        <div className='editOrderMobile-label'>Сумма</div>
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

        <div className='editOrderMobile-mainFields'>
          <div className='editOrderMobile-field'>
            <div className='editOrderMobile-label'>Менеджер</div>
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
          <div className='editOrderMobile-field'>
            <div className='editOrderMobile-label'>Комментарии</div>
            <Form.Control
              as='textarea'
              rows={4}
              value={order.comments || ''}
              onChange={(evt) => {
                order.comments = evt.target.value;
                refresh();
              }}
            />
          </div>
          <div className='editOrderMobile-field'>
            <div className='editOrderMobile-label'>ИП Перевозчик</div>
            <Form.Control
              as='input'
              type='text'
              value={order.ip || ''}
              onChange={(evt) => {
                order.ip = evt.target.value;
                refresh();
              }}
            />
          </div>
          <div className='editOrderMobile-field'>
            <div className='editOrderMobile-label'>Водитель</div>
            <Form.Control
              as='input'
              type='text'
              value={order.driver || ''}
              onChange={(evt) => {
                order.driver = evt.target.value;
                refresh();
              }}
            />
          </div>
          <div className='editOrderMobile-field'>
            <div className='editOrderMobile-label'>Стоимость доставки</div>
            <Form.Control
              as='input'
              type='number'
              value={order.cost || ''}
              onChange={(evt) => {
                order.cost = evt.target.value;
                setCost(evt.target.value);
                refresh();
              }}
            />
          </div>
          <div className='editOrderMobile-field'>
            <div className='editOrderMobile-label'>ОТК</div>
            <Form.Control
              as='input'
              type='text'
              value={order.otk || ''}
              onChange={(evt) => {
                order.otk = evt.target.value;
                refresh();
              }}
            />
          </div>
          <div className='editOrderMobile-field'>
            <div className='editOrderMobile-label'>Налог (40% от доставки)</div>
            <Form.Control
              as='input'
              type='number'
              readOnly
              value={Math.round((Number(cost) || 0) * 0.4)}
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

export default EditOrderMobile;

import './MailingEditor.css';
import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { MdDelete } from 'react-icons/md';
import { userContext } from './App';

function createLocalId(index = 0) {
  return Date.now() + Math.random() + index;
}

function parseMailingNumber(value, emptyAsZero = false) {
  const prepared = String(value || '').replace(/\s/g, '').replace(',', '.').trim();
  if (prepared === '') return emptyAsZero ? 0 : null;
  const parsed = Number(prepared);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMailingNumber(value) {
  return value.toLocaleString('ru-RU', {
    maximumFractionDigits: 6,
  });
}

function calculateBasisPriceWithMarkup(price, markup) {
  const parsedPrice = parseMailingNumber(price);
  if (parsedPrice === null) return '';

  const parsedMarkup = parseMailingNumber(markup, true);
  if (parsedMarkup === null) return '';

  return formatMailingNumber(parsedPrice + parsedMarkup);
}

function getSavedMailingData(mailing) {
  const saved = mailing?.categories_json;
  if (Array.isArray(saved)) {
    return { contactData: '', categories: saved };
  }
  return {
    contactData: String(saved?.contactData || ''),
    categories: Array.isArray(saved?.categories) ? saved.categories : [],
  };
}

function normalizeCategories(categories = []) {
  return categories.map((category, categoryIndex) => ({
    localId: createLocalId(categoryIndex),
    number: String(category?.number || categoryIndex + 1),
    name: String(category?.name || ''),
    visible: category?.visible !== false,
    markup: String(category?.markup || ''),
    bases: (Array.isArray(category?.bases) ? category.bases : []).map((basis, basisIndex) => {
      const price = String(basis?.price || '');
      const markup = String(basis?.markup || '');
      return {
        localId: createLocalId(categoryIndex + basisIndex + 1),
        name: String(basis?.name || ''),
        supplier: String(basis?.supplier || ''),
        product: String(basis?.product || ''),
        price,
        markup,
        individual: !!basis?.individual,
        priceWithMarkup: calculateBasisPriceWithMarkup(price, markup),
      };
    }),
  }));
}

function normalizeSavedCategories(mailing) {
  const savedData = getSavedMailingData(mailing);
  return normalizeCategories(savedData.categories);
}

function MailingEditor({ mode = 'new' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user, aAxios, apiBaseUrl, setToast } = useContext(userContext);
  const mailing = location.state?.mailing || null;
  const copiedCategories = Array.isArray(location.state?.copiedCategories)
    ? location.state.copiedCategories
    : null;
  const isEditMode = mode === 'edit';
  const title = isEditMode ? `Рассылка №${id || mailing?.id || ''}` : 'Новая рассылка';
  const [createdAt] = useState(() => mailing?.created_at || new Date().toISOString());
  const [employeeName, setEmployeeName] = useState(() => (
    mailing?.employee_json?.name || user?.name || ''
  ));
  const [contactData, setContactData] = useState(() => getSavedMailingData(mailing).contactData);
  const [categories, setCategories] = useState(() => (
    isEditMode ? normalizeSavedCategories(mailing) : normalizeCategories(copiedCategories || [])
  ));
  const [categoryForDelete, setCategoryForDelete] = useState(null);
  const [basisForDelete, setBasisForDelete] = useState(null);
  const [selfPdfWithoutMarkup, setSelfPdfWithoutMarkup] = useState(false);

  const formatCreatedAt = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (!employeeName && user?.name) {
      setEmployeeName(user.name);
    }
  }, [employeeName, user?.name]);

  const addCategory = () => {
    setCategories((current) => ([
      ...current,
      {
        localId: Date.now() + current.length,
        number: String(current.length + 1),
        name: '',
        visible: true,
        markup: '',
        bases: [],
      },
    ]));
  };

  const updateCategory = (localId, field, value) => {
    setCategories((current) => current.map((category) => {
      if (category.localId !== localId) return category;

      const updatedCategory = { ...category, [field]: value };

      if (field !== 'markup') return updatedCategory;

      return {
        ...updatedCategory,
        bases: (category.bases || []).map((basis) => (
          basis.individual
            ? basis
            : {
                ...basis,
                markup: value,
                priceWithMarkup: calculateBasisPriceWithMarkup(basis.price, value),
              }
        )),
      };
    }));
  };

  const deleteCategory = (localId) => {
    setCategories((current) => current.filter((category) => category.localId !== localId));
  };

  const addBasis = (categoryId) => {
    setCategories((current) => current.map((category) => {
      if (category.localId !== categoryId) return category;
      const bases = category.bases || [];
      return {
        ...category,
        bases: [
          ...bases,
          {
            localId: Date.now() + bases.length,
            name: '',
            supplier: '',
            product: '',
            price: '',
            markup: category.markup || '',
            individual: false,
            priceWithMarkup: calculateBasisPriceWithMarkup('', category.markup || ''),
          },
        ],
      };
    }));
  };

  const updateBasis = (categoryId, basisId, field, value) => {
    setCategories((current) => current.map((category) => {
      if (category.localId !== categoryId) return category;
      return {
        ...category,
        bases: (category.bases || []).map((basis) => {
          if (basis.localId !== basisId) return basis;

          const updatedBasis = { ...basis, [field]: value };
          if (field === 'individual' && !value) {
            updatedBasis.markup = category.markup || '';
          }
          if (field === 'price' || field === 'markup' || field === 'individual') {
            updatedBasis.priceWithMarkup = calculateBasisPriceWithMarkup(updatedBasis.price, updatedBasis.markup);
          }

          return updatedBasis;
        }),
      };
    }));
  };

  const deleteBasis = (categoryId, basisId) => {
    setCategories((current) => current.map((category) => {
      if (category.localId !== categoryId) return category;
      return {
        ...category,
        bases: (category.bases || []).filter((basis) => basis.localId !== basisId),
      };
    }));
  };

  const handleCloseDeleteModal = () => {
    setCategoryForDelete(null);
  };

  const handleDeleteConfirmed = () => {
    if (!categoryForDelete) return;
    deleteCategory(categoryForDelete.localId);
    handleCloseDeleteModal();
  };

  const handleCloseBasisDeleteModal = () => {
    setBasisForDelete(null);
  };

  const handleBasisDeleteConfirmed = () => {
    if (!basisForDelete) return;
    deleteBasis(basisForDelete.categoryId, basisForDelete.basis.localId);
    handleCloseBasisDeleteModal();
  };

  const buildCategoriesForSave = () => categories.map((category) => ({
    number: category.number,
    name: category.name,
    visible: category.visible,
    markup: category.markup,
    bases: (category.bases || []).map((basis) => ({
      name: basis.name,
      supplier: basis.supplier,
      product: basis.product,
      price: basis.price,
      markup: basis.markup,
      individual: basis.individual,
      priceWithMarkup: basis.priceWithMarkup,
    })),
  }));

  const saveMailing = async () => {
    try {
      const response = await aAxios.post('/user/savemailing', {
        id: isEditMode ? id || mailing?.id : undefined,
        categories_json: {
          contactData,
          categories: buildCategoriesForSave(),
        },
      });

      if (response.status === 202) {
        const savedMailing = response.data?.mailing;
        setToast(isEditMode ? 'Рассылка сохранена' : 'Рассылка создана');
        if (!isEditMode && savedMailing?.id) {
          navigate(`/mailing/edit/${savedMailing.id}`, { replace: true, state: { mailing: savedMailing } });
        }
      }
    } catch (error) {
      setToast(error?.response?.data?.message || 'Не удалось сохранить рассылку', 'danger');
    }
  };

  const openSelfPdf = () => {
    const mailingId = id || mailing?.id;
    if (!mailingId) return;
    const token = window.localStorage.token || '';
    const withoutMarkupParam = selfPdfWithoutMarkup ? '&withoutMarkup=1' : '';
    window.open(`${apiBaseUrl}/user/printmailing/self/${mailingId}?token=${encodeURIComponent(token)}${withoutMarkupParam}`, '_blank');
  };

  const openClientPdf = () => {
    const mailingId = id || mailing?.id;
    if (!mailingId) return;
    const token = window.localStorage.token || '';
    window.open(`${apiBaseUrl}/user/printmailing/client/${mailingId}?token=${encodeURIComponent(token)}`, '_blank');
  };

  const categoryDeleteLabel = categoryForDelete?.number || categoryForDelete?.name || '';
  const basisDeleteLabel = basisForDelete?.basis?.name ||
    basisForDelete?.basis?.supplier ||
    basisForDelete?.basis?.product ||
    '';

  return (
    <div className="mailingEditor">
      <div className="mailingEditor-topBar">
        <div className="mailingEditor-topBarLeft">
          <h2 className="mailingEditor-title">{title}</h2>
          <FloatingLabel className="mailingEditor-createdAtField" label="Дата и время создания">
            <Form.Control
              type="text"
              value={formatCreatedAt(createdAt)}
              disabled
              readOnly
            />
          </FloatingLabel>
          <FloatingLabel className="mailingEditor-employeeField" label="Сотрудник">
            <Form.Control
              type="text"
              value={employeeName}
              disabled
              readOnly
            />
          </FloatingLabel>
          <FloatingLabel className="mailingEditor-contactField" label="Контактные данные">
            <Form.Control
              type="text"
              value={contactData}
              onChange={(evt) => setContactData(evt.target.value)}
            />
          </FloatingLabel>
        </div>
        <div className="mailingEditor-topBarActions">
          <div className={`mailingEditor-pdfSelfControl${!isEditMode ? ' mailingEditor-pdfSelfControlDisabled' : ''}`}>
            <Button tabIndex={-1} variant="outline-secondary" disabled={!isEditMode} onClick={openSelfPdf}>
              PDF для себя
            </Button>
            <Form.Check
              className="mailingEditor-pdfSelfCheck"
              id="mailing-self-pdf-without-markup"
              type="checkbox"
              label="Без наценки"
              checked={selfPdfWithoutMarkup}
              disabled={!isEditMode}
              onChange={(evt) => setSelfPdfWithoutMarkup(evt.target.checked)}
            />
          </div>
          <Button tabIndex={-1} variant="outline-secondary" disabled={!isEditMode} onClick={openClientPdf}>
            PDF для клиента
          </Button>
          <Button tabIndex={-1} variant="success" onClick={saveMailing}>
            Сохранить
          </Button>
          <Button tabIndex={-1} variant="primary" onClick={() => navigate('/mailing')}>
            Назад
          </Button>
        </div>
      </div>

      <div className="mailingEditor-categories">
        <div className="mailingEditor-categoriesHeader">
          <Button
            tabIndex={-1}
            variant="success"
            className="mailingEditor-addCategoryBtn"
            onClick={addCategory}
          >
            + Категория
          </Button>
        </div>

        {categories.length === 0 &&
          <div className="mailingEditor-emptyCategories">
            Категории пока не добавлены
          </div>
        }

        {categories.map((category) => (
          <div className="mailingEditor-categoryCard" key={category.localId}>
            <div className="mailingEditor-categoryRow">
              <FloatingLabel className="mailingEditor-numberField" label="Порядковый номер">
                <Form.Control
                  type="text"
                  value={category.number}
                  onChange={(evt) => updateCategory(category.localId, 'number', evt.target.value)}
                />
              </FloatingLabel>

              <Form.Group className="mailingEditor-nameField">
                <div className="mailingEditor-nameInputWrap">
                  <FloatingLabel className="mailingEditor-nameFloatingField" label="Название">
                    <Form.Control
                      type="text"
                      value={category.name}
                      onChange={(evt) => updateCategory(category.localId, 'name', evt.target.value)}
                    />
                  </FloatingLabel>
                  <Form.Check
                    className="mailingEditor-visibleCheck"
                    id={`mailing-category-visible-${category.localId}`}
                    type="checkbox"
                    label="Отображать"
                    checked={category.visible}
                    onChange={(evt) => updateCategory(category.localId, 'visible', evt.target.checked)}
                  />
                </div>
              </Form.Group>

              <FloatingLabel className="mailingEditor-markupField" label="Наценка для категории">
                <Form.Control
                  type="text"
                  value={category.markup}
                  onChange={(evt) => updateCategory(category.localId, 'markup', evt.target.value)}
                />
              </FloatingLabel>

              <Button
                tabIndex={-1}
                variant="outline-success"
                size="sm"
                className="mailingEditor-addBasisBtn"
                onClick={() => addBasis(category.localId)}
              >
                + Базис
              </Button>

              <button
                type="button"
                className="mailingEditor-deleteCategoryBtn"
                title="Удалить категорию"
                aria-label="Удалить категорию"
                onClick={() => setCategoryForDelete(category)}
              >
                Удалить категорию
              </button>
            </div>

            {(category.bases || []).map((basis) => (
              <div className="mailingEditor-basisRow" key={basis.localId}>
                <FloatingLabel className="mailingEditor-basisNameField" label="Название базиса">
                  <Form.Control
                    type="text"
                    value={basis.name}
                    onChange={(evt) => updateBasis(category.localId, basis.localId, 'name', evt.target.value)}
                  />
                </FloatingLabel>

                <FloatingLabel className="mailingEditor-basisSupplierField" label="Поставщик">
                  <Form.Control
                    type="text"
                    value={basis.supplier}
                    onChange={(evt) => updateBasis(category.localId, basis.localId, 'supplier', evt.target.value)}
                  />
                </FloatingLabel>

                <FloatingLabel className="mailingEditor-basisProductField" label="Продукт">
                  <Form.Control
                    type="text"
                    value={basis.product}
                    onChange={(evt) => updateBasis(category.localId, basis.localId, 'product', evt.target.value)}
                  />
                </FloatingLabel>

                <FloatingLabel className="mailingEditor-basisPriceBaseField" label="Цена">
                  <Form.Control
                    type="text"
                    value={basis.price}
                    onChange={(evt) => updateBasis(category.localId, basis.localId, 'price', evt.target.value)}
                  />
                </FloatingLabel>

                <Form.Group className="mailingEditor-basisMarkupField">
                  <div className="mailingEditor-basisMarkupWrap">
                    <FloatingLabel className="mailingEditor-basisMarkupFloatingField" label="Наценка">
                      <Form.Control
                        type="text"
                        value={basis.markup}
                        disabled={!basis.individual}
                        onChange={(evt) => updateBasis(category.localId, basis.localId, 'markup', evt.target.value)}
                      />
                    </FloatingLabel>
                    <Form.Check
                      className="mailingEditor-individualCheck"
                      id={`mailing-basis-individual-${category.localId}-${basis.localId}`}
                      type="checkbox"
                      label="Индивидуальная"
                      checked={basis.individual}
                      onChange={(evt) => updateBasis(category.localId, basis.localId, 'individual', evt.target.checked)}
                    />
                  </div>
                </Form.Group>

                <FloatingLabel className="mailingEditor-basisPriceField" label="Цена с наценкой">
                  <Form.Control
                    type="text"
                    value={basis.priceWithMarkup}
                    disabled
                    readOnly
                  />
                </FloatingLabel>

                <button
                  type="button"
                  className="mailingEditor-deleteBasisBtn"
                  title="Удалить базис"
                  aria-label="Удалить базис"
                  onClick={() => setBasisForDelete({ categoryId: category.localId, basis })}
                >
                  <MdDelete />
                  <span className="mailingEditor-deleteBasisText">Удалить базис</span>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Modal centered show={!!categoryForDelete} onHide={handleCloseDeleteModal} animation={true}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления категории {categoryDeleteLabel}</Modal.Title>
        </Modal.Header>
        <Modal.Body>Точно удаляем?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Еще подумаю
          </Button>
          <Button variant="primary" className="col-3" onClick={handleDeleteConfirmed}>
            Да
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal centered show={!!basisForDelete} onHide={handleCloseBasisDeleteModal} animation={true}>
        <Modal.Header closeButton>
          <Modal.Title>Подтверждение удаления базиса {basisDeleteLabel}</Modal.Title>
        </Modal.Header>
        <Modal.Body>Точно удаляем?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseBasisDeleteModal}>
            Еще подумаю
          </Button>
          <Button variant="primary" className="col-3" onClick={handleBasisDeleteConfirmed}>
            Да
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default MailingEditor;

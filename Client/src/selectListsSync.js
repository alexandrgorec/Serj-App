const DEFAULT_SELECT_LISTS = {
  SUPPLIERS: [],
  BUYERS: [],
  DRIVERS: [],
  TYPE_OF_PRODUCT: [],
  MANAGERS: [],
};

function cleanListValue(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function addUniqueValue(nextLists, listName, value) {
  const cleaned = cleanListValue(value);
  if (cleaned === '') return false;

  const list = Array.isArray(nextLists[listName]) ? nextLists[listName] : [];
  const exists = list.some((item) => cleanListValue(item) === cleaned);
  if (exists) {
    nextLists[listName] = list;
    return false;
  }

  nextLists[listName] = [...list, cleaned];
  return true;
}

function collectOrderSelectListValues(order) {
  const values = {
    SUPPLIERS: [],
    BUYERS: [],
    TYPE_OF_PRODUCT: [],
  };

  (order?.suppliers || []).forEach((supplier) => {
    values.SUPPLIERS.push(supplier?.name);
    values.TYPE_OF_PRODUCT.push(supplier?.typeOfProduct);
  });

  (order?.buyers || []).forEach((buyer) => {
    values.BUYERS.push(buyer?.name);
    values.TYPE_OF_PRODUCT.push(buyer?.typeOfProduct);

    (buyer?.buyersH || []).forEach((buyerH) => {
      values.BUYERS.push(buyerH?.name);
      values.TYPE_OF_PRODUCT.push(buyerH?.typeOfProduct);
    });
  });

  return values;
}

export async function syncOrderSelectLists({ order, user, setUser, aAxios }) {
  const currentLists = user?.selectListsData || {};
  const nextLists = {
    ...DEFAULT_SELECT_LISTS,
    ...currentLists,
  };

  Object.keys(nextLists).forEach((key) => {
    nextLists[key] = Array.isArray(nextLists[key]) ? [...nextLists[key]] : [];
  });

  const orderValues = collectOrderSelectListValues(order);
  let hasChanges = false;

  Object.entries(orderValues).forEach(([listName, values]) => {
    values.forEach((value) => {
      if (addUniqueValue(nextLists, listName, value)) hasChanges = true;
    });
  });

  if (!hasChanges) return false;

  await aAxios.post('/user/editSelectListsData', {
    selectListsData: nextLists,
  });

  setUser((prevUser) => ({
    ...prevUser,
    selectListsData: nextLists,
  }));

  return true;
}

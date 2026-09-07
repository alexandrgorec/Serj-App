const fs = require("fs");
const PDFDocument = require("pdfkit");
const { pool } = require("../db");
const { writeAuditLog } = require("../utils/audit-log");

const REPORT_PAGE_SIZE = "A4";
const REPORT_PAGE_WIDTH_PT = 595.28;
const REPORT_PAGE_HEIGHT_PT = 841.89;

const LAYOUT_PROFILES = [
    { margin: 22, titleSize: 18.0, sectionSize: 12.2, headerSize: 8.4, bodySize: 7.2, cellPadX: 3.6, cellPadY: 2.4, lineGap: 4.0, sectionGap: 6.0, borderWidth: 0.55 },
    { margin: 20, titleSize: 16.5, sectionSize: 11.4, headerSize: 7.8, bodySize: 6.6, cellPadX: 3.2, cellPadY: 2.1, lineGap: 3.5, sectionGap: 5.2, borderWidth: 0.52 },
    { margin: 18, titleSize: 15.0, sectionSize: 10.6, headerSize: 7.2, bodySize: 6.0, cellPadX: 2.8, cellPadY: 1.8, lineGap: 3.0, sectionGap: 4.4, borderWidth: 0.48 },
    { margin: 16, titleSize: 13.8, sectionSize: 9.8, headerSize: 6.6, bodySize: 5.4, cellPadX: 2.4, cellPadY: 1.55, lineGap: 2.6, sectionGap: 3.7, borderWidth: 0.44 },
    { margin: 14, titleSize: 12.6, sectionSize: 9.0, headerSize: 6.0, bodySize: 4.8, cellPadX: 2.1, cellPadY: 1.35, lineGap: 2.2, sectionGap: 3.0, borderWidth: 0.40 },
];

function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
}

function textValue(value) {
    return hasValue(value) ? String(value).trim() : "—";
}

function compactText(value) {
    if (!hasValue(value)) return "";
    return String(value).replace(/\s+/g, " ").trim();
}

function formatDateRu(value) {
    if (!hasValue(value)) return "—";
    const date = new Date(Date.parse(String(value)));
    if (Number.isNaN(date.getTime())) return textValue(value);
    let dd = date.getDate();
    if (dd < 10) dd = `0${dd}`;
    let mm = date.getMonth() + 1;
    if (mm < 10) mm = `0${mm}`;
    const yy = date.getFullYear();
    return `${dd}.${mm}.${yy}`;
}

function numberValue(value) {
    if (!hasValue(value)) return "—";
    let s = String(value).trim();
    const originalHadComma = s.includes(",");
    s = s.replace(/\s/g, "").replace(/,/g, ".");

    const sign = s.startsWith("-") ? "-" : "";
    if (sign) s = s.slice(1);

    const [intRaw, fracRaw] = s.split(".");
    if (!intRaw || !/^\d+$/.test(intRaw)) return textValue(value);
    const intFormatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(intRaw));
    if (fracRaw === undefined || !/^\d+$/.test(fracRaw)) return `${sign}${intFormatted}`;
    const decSep = originalHadComma ? "," : ".";
    return `${sign}${intFormatted}${decSep}${fracRaw}`;
}

function parseNumberValue(value) {
    if (!hasValue(value)) return null;
    const normalized = String(value).replace(/[\s\u00A0]+/g, "").replace(",", ".");
    if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) return null;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
}

function calculateDeliveryTax(order) {
    const cost = parseNumberValue(order?.cost);
    const normalizedCost = cost === null ? 0 : cost;
    return Math.round(normalizedCost * 0.4);
}

function parseOrderNumber(value) {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const normalized = String(value).replace(/\s/g, "").trim();
    if (!/^\d+$/.test(normalized)) return NaN;
    const orderNumber = Number(normalized);
    return Number.isSafeInteger(orderNumber) && orderNumber > 0 ? orderNumber : NaN;
}

async function syncOrderNumberSequence() {
    await pool.query(`
        SELECT setval(
            'orders_order_number_seq',
            GREATEST(COALESCE(MAX(order_number), 1), 1),
            MAX(order_number) IS NOT NULL
        )
        FROM orders
    `);
}

function resolveFontFamily() {
    const candidates = [
        { regular: "/System/Library/Fonts/Supplemental/Arial.ttf", bold: "/System/Library/Fonts/Supplemental/Arial Bold.ttf" },
        { regular: "/Library/Fonts/Arial.ttf", bold: "/Library/Fonts/Arial Bold.ttf" },
        { regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" },
        { regular: "/usr/share/fonts/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf" },
        { regular: "C:\\Windows\\Fonts\\arial.ttf", bold: "C:\\Windows\\Fonts\\arialbd.ttf" },
    ];
    for (let i = 0; i < candidates.length; i += 1) {
        const item = candidates[i];
        if (!fs.existsSync(item.regular)) continue;
        if (fs.existsSync(item.bold)) return { regular: item.regular, bold: item.bold };
        return { regular: item.regular, bold: item.regular };
    }
    return { regular: "Helvetica", bold: "Helvetica-Bold" };
}

function normalizeWeights(columns) {
    const sum = columns.reduce((acc, col) => acc + (Number(col.weight) || 0), 0) || 1;
    return columns.map((col) => ({ ...col, weight: (Number(col.weight) || 0) / sum }));
}

function makeMetaTable(orderId, order, printedAt) {
    const columns = normalizeWeights([
        { key: "k1", label: "Поле", weight: 0.20, align: "left" },
        { key: "v1", label: "Значение", weight: 0.30, align: "left" },
        { key: "k2", label: "Поле", weight: 0.20, align: "left" },
        { key: "v2", label: "Значение", weight: 0.30, align: "left" },
    ]);
    const rows = [
        { cells: ["Заявка №", String(orderId), "Дата заявки", formatDateRu(order?.date)] },
        { cells: ["Менеджер", textValue(order?.manager), "Дата печати", printedAt] },
        { cells: ["Перевозчик", textValue(order?.ip), "Водитель", textValue(order?.driver)] },
        { cells: ["Сумма доставки", numberValue(order?.cost), "ОТК", textValue(order?.otk)] },
        { cells: ["Налог (40% от доставки)", String(calculateDeliveryTax(order)), "", ""] },
    ];
    return { title: "Реквизиты", columns, rows };
}

function makeSuppliersTable(order, showFinBlock) {
    const suppliers = Array.isArray(order?.suppliers) ? order.suppliers : [];
    const columns = normalizeWeights(showFinBlock
        ? [
            { key: "n", label: "№", weight: 0.05, align: "center" },
            { key: "name", label: "Поставщик", weight: 0.16, align: "left" },
            { key: "product", label: "Продукт", weight: 0.16, align: "left" },
            { key: "liters", label: "Л", weight: 0.07, align: "right" },
            { key: "tons", label: "Т", weight: 0.07, align: "right" },
            { key: "price", label: "Цена", weight: 0.09, align: "right" },
            { key: "sf", label: "С/Ф", weight: 0.1, align: "left" },
            { key: "date", label: "Дата", weight: 0.09, align: "center" },
            { key: "summa", label: "Σ", weight: 0.12, align: "right" },
            { key: "akt", label: "Акт", weight: 0.09, align: "left" },
        ]
        : [
            { key: "n", label: "№", weight: 0.07, align: "center" },
            { key: "name", label: "Поставщик", weight: 0.29, align: "left" },
            { key: "product", label: "Продукт", weight: 0.26, align: "left" },
            { key: "liters", label: "Л", weight: 0.10, align: "right" },
            { key: "tons", label: "Т", weight: 0.10, align: "right" },
            { key: "price", label: "Цена", weight: 0.18, align: "right" },
        ]);

    const rows = suppliers.map((supplier, index) => {
        const base = [
            String(index + 1),
            textValue(supplier?.name),
            textValue(supplier?.typeOfProduct),
            numberValue(supplier?.liters),
            numberValue(supplier?.tons),
            numberValue(supplier?.price),
        ];
        const fin = showFinBlock
            ? [textValue(supplier?.sf), formatDateRu(supplier?.date || order?.date), numberValue(supplier?.summa), textValue(supplier?.akt)]
            : [];
        return { cells: [...base, ...fin] };
    });

    return {
        title: `Поставщики (${suppliers.length})`,
        columns,
        rows: rows.length ? rows : [{ cells: new Array(columns.length).fill("—") }],
    };
}

function makeBuyersTable(order, showFinBlock) {
    const buyers = Array.isArray(order?.buyers) ? order.buyers : [];
    const columns = normalizeWeights(showFinBlock
        ? [
            { key: "type", label: "Тип", weight: 0.04, align: "center" },
            { key: "n", label: "№", weight: 0.05, align: "center" },
            { key: "name", label: "Покупатель", weight: 0.19, align: "left" },
            { key: "product", label: "Продукт", weight: 0.18, align: "left" },
            { key: "liters", label: "Л", weight: 0.06, align: "right" },
            { key: "tons", label: "Т", weight: 0.06, align: "right" },
            { key: "price", label: "Цена", weight: 0.07, align: "right" },
            { key: "sf", label: "С/Ф", weight: 0.08, align: "left" },
            { key: "date", label: "Дата", weight: 0.08, align: "center" },
            { key: "summa", label: "Σ", weight: 0.10, align: "right" },
            { key: "akt", label: "Акт", weight: 0.09, align: "left" },
        ]
        : [
            { key: "type", label: "Тип", weight: 0.06, align: "center" },
            { key: "n", label: "№", weight: 0.06, align: "center" },
            { key: "name", label: "Покупатель", weight: 0.30, align: "left" },
            { key: "product", label: "Продукт", weight: 0.26, align: "left" },
            { key: "liters", label: "Л", weight: 0.1, align: "right" },
            { key: "tons", label: "Т", weight: 0.1, align: "right" },
            { key: "price", label: "Цена", weight: 0.12, align: "right" },
        ]);

    const rows = [];
    buyers.forEach((buyer, buyerIndex) => {
        const base = [
            "П",
            String(buyerIndex + 1),
            textValue(buyer?.name),
            textValue(buyer?.typeOfProduct),
            numberValue(buyer?.liters),
            numberValue(buyer?.tons),
            numberValue(buyer?.price),
        ];
        const fin = showFinBlock
            ? [textValue(buyer?.sf), formatDateRu(buyer?.date || order?.date), numberValue(buyer?.summa), textValue(buyer?.akt)]
            : [];
        rows.push({ rowType: "buyer", cells: [...base, ...fin] });

        const buyersH = Array.isArray(buyer?.buyersH) ? buyer.buyersH : [];
        buyersH.forEach((buyerH, buyerHIndex) => {
            const baseH = [
                "H",
                `${buyerIndex + 1}.${buyerHIndex + 1}`,
                textValue(buyerH?.name),
                textValue(buyerH?.typeOfProduct),
                numberValue(buyerH?.liters),
                numberValue(buyerH?.tons),
                numberValue(buyerH?.price),
            ];
            const finH = showFinBlock
                ? [textValue(buyerH?.sf), formatDateRu(buyerH?.date || order?.date), numberValue(buyerH?.summa), textValue(buyerH?.akt)]
                : [];
            rows.push({ rowType: "buyerH", cells: [...baseH, ...finH] });
        });
    });

    return {
        title: `Покупатели (${buyers.length})`,
        columns,
        rows: rows.length ? rows : [{ cells: new Array(columns.length).fill("—") }],
    };
}

function makeCommentsTable(order) {
    const comments = compactText(order?.comments);
    if (!comments) return null;
    return {
        title: "Комментарии",
        columns: normalizeWeights([{ key: "comments", label: "Текст", weight: 1, align: "left" }]),
        rows: [{ cells: [comments] }],
    };
}

function estimateTextHeight(text, fontSize, width) {
    const safeWidth = Math.max(24, Number(width) || 24);
    const charsPerLine = Math.max(8, Math.floor(safeWidth / (fontSize * 0.54)));
    const lines = String(text)
        .split("\n")
        .reduce((sum, row) => sum + Math.max(1, Math.ceil(row.length / charsPerLine)), 0);
    return lines * fontSize * 1.17;
}

function estimateRowHeight(row, columns, profile, tableWidth, isHeader = false) {
    const fontSize = isHeader ? profile.headerSize : profile.bodySize;
    let maxHeight = fontSize * 1.2;
    // let x = 0;
    for (let i = 0; i < columns.length; i += 1) {
        const colWidth = columns[i].weight * tableWidth;
        const text = isHeader ? columns[i].label : textValue(row.cells[i]);
        const textHeight = estimateTextHeight(text, fontSize, Math.max(10, colWidth - profile.cellPadX * 2));
        if (textHeight > maxHeight) maxHeight = textHeight;
        // x += colWidth;
    }
    return maxHeight + profile.cellPadY * 2;
}

function estimatePages(report, profile) {
    const contentWidth = REPORT_PAGE_WIDTH_PT - profile.margin * 2;
    const pageBottom = REPORT_PAGE_HEIGHT_PT - profile.margin;
    let pages = 1;
    let y = profile.margin;

    const ensure = (height) => {
        if (y + height <= pageBottom) return false;
        pages += 1;
        y = profile.margin;
        return true;
    };

    const titleHeight = estimateTextHeight(report.title, profile.titleSize, contentWidth) + profile.lineGap;
    ensure(titleHeight);
    y += titleHeight;

    for (let t = 0; t < report.tables.length; t += 1) {
        const table = report.tables[t];
        const sectionHeight = estimateTextHeight(table.title, profile.sectionSize, contentWidth) + profile.lineGap;
        ensure(sectionHeight);
        y += sectionHeight;

        const headerHeight = estimateRowHeight({ cells: [] }, table.columns, profile, contentWidth, true);
        ensure(headerHeight);
        y += headerHeight;

        for (let r = 0; r < table.rows.length; r += 1) {
            const rowHeight = estimateRowHeight(table.rows[r], table.columns, profile, contentWidth, false);
            const pageBroke = ensure(rowHeight);
            if (pageBroke) y += headerHeight;
            y += rowHeight;
        }
        y += profile.sectionGap;
    }
    return pages;
}

function pickLayout(report) {
    let bestProfile = LAYOUT_PROFILES[0];
    let bestPages = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < LAYOUT_PROFILES.length; i += 1) {
        const profile = LAYOUT_PROFILES[i];
        const pages = estimatePages(report, profile);
        if (pages === 1) return profile;
        if (pages < bestPages) {
            bestPages = pages;
            bestProfile = profile;
        }
    }
    return bestProfile;
}

function measureRowHeightDoc(doc, row, columns, profile, widths, isHeader = false) {
    const fontSize = isHeader ? profile.headerSize : profile.bodySize;
    let maxHeight = fontSize * 1.2;
    for (let i = 0; i < columns.length; i += 1) {
        const text = isHeader ? columns[i].label : textValue(row.cells[i]);
        const textHeight = doc.heightOfString(text, { width: Math.max(10, widths[i] - profile.cellPadX * 2), align: columns[i].align || "left" });
        if (textHeight > maxHeight) maxHeight = textHeight;
    }
    return maxHeight + profile.cellPadY * 2;
}

function drawRow(doc, opts) {
    const {
        x,
        y,
        widths,
        columns,
        row,
        profile,
        fonts,
        isHeader = false,
        fillColor = null,
        strokeColor = "#bac4d6",
        textColor = "#122034",
    } = opts;

    doc.font(isHeader ? fonts.bold : fonts.regular).fontSize(isHeader ? profile.headerSize : profile.bodySize);
    const rowHeight = measureRowHeightDoc(doc, row, columns, profile, widths, isHeader);

    let cx = x;
    for (let i = 0; i < widths.length; i += 1) {
        const width = widths[i];
        if (fillColor) {
            doc.save();
            doc.rect(cx, y, width, rowHeight).fillColor(fillColor).fill();
            doc.restore();
        }
        doc.save();
        doc.lineWidth(profile.borderWidth).strokeColor(strokeColor).rect(cx, y, width, rowHeight).stroke();
        doc.restore();

        const text = isHeader ? columns[i].label : textValue(row.cells[i]);
        doc.fillColor(textColor)
            .font(isHeader ? fonts.bold : fonts.regular)
            .fontSize(isHeader ? profile.headerSize : profile.bodySize)
            .text(text, cx + profile.cellPadX, y + profile.cellPadY, {
                width: Math.max(10, width - profile.cellPadX * 2),
                align: columns[i].align || "left",
            });
        cx += width;
    }
    return rowHeight;
}

function renderTable(doc, table, state) {
    const { profile, fonts, pageSetup } = state;
    const x = profile.margin;
    const width = doc.page.width - profile.margin * 2;
    const widths = table.columns.map((col) => col.weight * width);
    const bottom = () => doc.page.height - profile.margin;

    doc.font(fonts.bold).fontSize(profile.sectionSize);
    const titleHeight = doc.heightOfString(table.title, { width });
    if (state.y + titleHeight > bottom()) {
        doc.addPage(pageSetup);
        state.y = profile.margin;
    }
    doc.fillColor("#0b1f3c").text(table.title, x, state.y, { width });
    state.y += titleHeight + profile.lineGap;

    const headerPainter = () => {
        const headerRow = { cells: table.columns.map((c) => c.label) };
        const headerHeight = drawRow(doc, {
            x,
            y: state.y,
            widths,
            columns: table.columns,
            row: headerRow,
            profile,
            fonts,
            isHeader: true,
            fillColor: "#e8edf7",
            strokeColor: "#aab6cc",
            textColor: "#142846",
        });
        state.y += headerHeight;
        return headerHeight;
    };

    let headerHeight = measureRowHeightDoc(doc, { cells: [] }, table.columns, profile, widths, true);
    if (state.y + headerHeight > bottom()) {
        doc.addPage(pageSetup);
        state.y = profile.margin;
    }
    headerHeight = headerPainter();

    for (let i = 0; i < table.rows.length; i += 1) {
        const row = table.rows[i];
        doc.font(fonts.regular).fontSize(profile.bodySize);
        const rowHeight = measureRowHeightDoc(doc, row, table.columns, profile, widths, false);

        if (state.y + rowHeight > bottom()) {
            doc.addPage(pageSetup);
            state.y = profile.margin;
            headerHeight = headerPainter();
            if (state.y + rowHeight > bottom()) {
                // Если строка все равно не помещается (очень редкий кейс), печатаем как есть после заголовка.
                state.y = profile.margin + headerHeight;
            }
        }

        let fillColor = i % 2 === 0 ? "#ffffff" : "#f9fbfe";
        if (row.rowType === "buyerH") fillColor = "#ebf8ee";
        drawRow(doc, {
            x,
            y: state.y,
            widths,
            columns: table.columns,
            row,
            profile,
            fonts,
            isHeader: false,
            fillColor,
            strokeColor: "#c0cada",
            textColor: "#122034",
        });
        state.y += rowHeight;
    }

    state.y += profile.sectionGap;
}

function renderReport(doc, report, profile, fonts) {
    const pageSetup = { size: REPORT_PAGE_SIZE, margins: { top: 0, bottom: 0, left: 0, right: 0 } };
    doc.addPage(pageSetup);
    const state = { y: profile.margin, profile, fonts, pageSetup };
    const x = profile.margin;
    const width = doc.page.width - profile.margin * 2;

    doc.font(fonts.bold).fontSize(profile.titleSize).fillColor("#07182f");
    const titleHeight = doc.heightOfString(report.title, { width });
    doc.text(report.title, x, state.y, { width });
    state.y += titleHeight + profile.lineGap;

    report.tables.forEach((table) => {
        renderTable(doc, table, state);
    });
}

function buildReport(orderId, order, showFinBlock) {
    const printedAt = new Date().toLocaleString("ru-RU");
    const metaTable = makeMetaTable(orderId, order, printedAt);
    const suppliersTable = makeSuppliersTable(order, showFinBlock);
    const buyersTable = makeBuyersTable(order, showFinBlock);
    const commentsTable = makeCommentsTable(order);

    const tables = [metaTable, suppliersTable, buyersTable];
    if (commentsTable) tables.push(commentsTable);
    return { title: `Заявка №${orderId}`, tables };
}

const ORDER_DIFF_IGNORED_KEYS = new Set(["id", "haveEmptyBuyerH"]);
const ORDER_DIFF_MAX_CHANGES_IN_LOG = 200;
const ORDER_DIFF_MAX_VALUE_LEN = 180;

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatAuditValue(value) {
    if (value === undefined) return "∅";
    if (value === null) return "null";
    if (typeof value === "string") {
        if (value === "") return "\"\"";
        return value.length > ORDER_DIFF_MAX_VALUE_LEN ? `${value.slice(0, ORDER_DIFF_MAX_VALUE_LEN)}…` : value;
    }
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
        const serialized = JSON.stringify(value);
        return serialized.length > ORDER_DIFF_MAX_VALUE_LEN
            ? `${serialized.slice(0, ORDER_DIFF_MAX_VALUE_LEN)}…`
            : serialized;
    } catch  {
        const text = String(value);
        return text.length > ORDER_DIFF_MAX_VALUE_LEN ? `${text.slice(0, ORDER_DIFF_MAX_VALUE_LEN)}…` : text;
    }
}

function collectOrderDiff(beforeValue, afterValue, path, output) {
    if (beforeValue === afterValue) return;
    const beforeIsArray = Array.isArray(beforeValue);
    const afterIsArray = Array.isArray(afterValue);
    const beforeIsObject = isPlainObject(beforeValue);
    const afterIsObject = isPlainObject(afterValue);

    if (beforeIsArray && afterIsArray) {
        const maxLen = Math.max(beforeValue.length, afterValue.length);
        for (let i = 0; i < maxLen; i += 1) {
            collectOrderDiff(beforeValue[i], afterValue[i], `${path}[${i}]`, output);
        }
        return;
    }

    if (beforeIsObject && afterIsObject) {
        const keys = new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]);
        keys.forEach((key) => {
            if (ORDER_DIFF_IGNORED_KEYS.has(key)) return;
            const nextPath = path ? `${path}.${key}` : key;
            collectOrderDiff(beforeValue[key], afterValue[key], nextPath, output);
        });
        return;
    }

    output.push({
        field: path || "order",
        before: formatAuditValue(beforeValue),
        after: formatAuditValue(afterValue),
    });
}

function buildOrderChanges(beforeOrder, afterOrder) {
    const changes = [];
    collectOrderDiff(beforeOrder || {}, afterOrder || {}, "", changes);
    return changes;
}

class OrderController {
    async neworder(req, res) {
        const order = req.body.order;
        const requestedOrderNumber = parseOrderNumber(order?.orderNumber ?? order?.order_number);
        if (Number.isNaN(requestedOrderNumber)) {
            res.status(400).json({ message: "Некорректный номер заявки" });
            return;
        }

        const insertText = requestedOrderNumber === null
            ? "INSERT INTO orders(orderjson) VALUES ($1) RETURNING id, order_number"
            : "INSERT INTO orders(orderjson, order_number) VALUES ($1, $2) RETURNING id, order_number";
        const insertParams = requestedOrderNumber === null ? [order] : [order, requestedOrderNumber];

        try {
            const result = await pool.query(insertText, insertParams);
            const createdId = result.rows[0].id;
            const orderNumber = result.rows[0].order_number;
            await syncOrderNumberSequence();

            writeAuditLog({
                actorUserId: req.body.userId,
                actorName: req.body.user,
                action: "CREATE_ORDER",
                entityType: "order",
                entityId: createdId,
                route: "/user/neworder",
                payload: {
                    orderNumber,
                    date: order?.date || null,
                    suppliersCount: Array.isArray(order?.suppliers) ? order.suppliers.length : 0,
                    buyersCount: Array.isArray(order?.buyers) ? order.buyers.length : 0,
                },
            }).catch((logError) => {
                console.error("Audit log error (CREATE_ORDER):", logError);
            });

            res.status(202).json({ id: createdId, orderNumber });
        } catch (err) {
            if (err?.code === "23505") {
                res.status(409).json({ message: "Заявка с таким номером уже существует" });
                return;
            }
            console.error("Error create order", err.stack || err);
            res.sendStatus(400);
        }
    }

    async getallorders(req, res) {
        pool.query("select id, order_number, orderjson from orders ORDER BY id DESC", (err, result) => {
            if (err) {
                console.error("Error connecting to the database", err.stack);
                res.send("ошибка доступа к базе данных");
            } else {
                res.status(202);
                const answer = {};
                answer.orders = result.rows;
                res.json(answer);
            }
        });
    }

    async deleteorder(req, res) {
        const id = req.body.id;
        try {
            const result = await pool.query("delete from orders where id = $1 RETURNING order_number", [id]);
            const orderNumber = result.rows?.[0]?.order_number || id;
            writeAuditLog({
                actorUserId: req.body.userId,
                actorName: req.body.user,
                action: "DELETE_ORDER",
                entityType: "order",
                entityId: id,
                route: "/user/deleteorder",
                payload: { orderNumber },
            }).catch((logError) => {
                console.error("Audit log error (DELETE_ORDER):", logError);
            });
            res.sendStatus(202);
        } catch (err) {
            console.error("Error delete order", err.stack || err);
            res.send("ошибка доступа к базе данных");
        }
    }

    async editorder(req, res) {
        const order = req.body.editingOrder;
        const requestedOrderNumber = parseOrderNumber(order?.orderNumber ?? order?.order_number);
        if (Number.isNaN(requestedOrderNumber)) {
            res.status(400).json({ message: "Некорректный номер заявки" });
            return;
        }

        try {
            const previousOrderRes = await pool.query("select order_number, orderjson from orders where id = $1", [order.id]);
            if (!previousOrderRes?.rows?.[0]) {
                res.status(404).json({ message: "Заявка не найдена" });
                return;
            }

            const previousOrderNumber = previousOrderRes.rows[0].order_number;
            const orderNumber = requestedOrderNumber === null ? previousOrderNumber : requestedOrderNumber;
            const previousOrder = {
                ...(previousOrderRes.rows[0].orderjson || {}),
                orderNumber: previousOrderNumber,
            };
            const nextOrder = {
                ...order,
                orderNumber,
            };

            await pool.query(
                "UPDATE orders SET orderjson = $1, order_number = $2 where id = $3",
                [nextOrder, orderNumber, order.id]
            );
            await syncOrderNumberSequence();

            const allChanges = buildOrderChanges(previousOrder, nextOrder);
            const changes = allChanges.slice(0, ORDER_DIFF_MAX_CHANGES_IN_LOG);
            writeAuditLog({
                actorUserId: req.body.userId,
                actorName: req.body.user,
                action: "UPDATE_ORDER",
                entityType: "order",
                entityId: order?.id,
                route: "/user/editorder",
                payload: {
                    orderNumber,
                    totalChanges: allChanges.length,
                    shownChanges: changes.length,
                    truncated: allChanges.length > changes.length,
                    changes,
                },
            }).catch((logError) => {
                console.error("Audit log error (UPDATE_ORDER):", logError);
            });
            res.sendStatus(202);
        } catch (err) {
            if (err?.code === "23505") {
                res.status(409).json({ message: "Заявка с таким номером уже существует" });
                return;
            }
            console.error("Error connecting to the database", err.stack || err);
            res.send("ошибка доступа к базе данных");
        }
    }

    async printorder(req, res) {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).send("Некорректный номер заявки");
            return;
        }

        pool.query("select id, order_number, orderjson from orders where id = $1", [id], (err, result) => {
            if (err) {
                console.error("Error loading order for print", err.stack);
                res.status(500).send("Ошибка доступа к базе данных");
                return;
            }
            if (!result.rows[0]) {
                res.status(404).send("Заявка не найдена");
                return;
            }

            const order = result.rows[0].orderjson || {};
            const orderNumber = result.rows[0].order_number || id;
            const showFinBlock = !!req.body?.rights?.finBlockAccess;
            const report = buildReport(orderNumber, order, showFinBlock);
            const profile = pickLayout(report);
            const fonts = resolveFontFamily();

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="order-${orderNumber}.pdf"`);
            res.status(200);

            const doc = new PDFDocument({ autoFirstPage: false, size: REPORT_PAGE_SIZE, margin: 0, compress: true });
            doc.pipe(res);
            renderReport(doc, report, profile, fonts);
            doc.end();
        });
    }
}

module.exports = new OrderController();

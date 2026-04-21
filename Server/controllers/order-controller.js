const fs = require("fs");
const PDFDocument = require("pdfkit");
const { pool } = require("../db");

const A5_WIDTH_PT = 419.53;
const A5_HEIGHT_PT = 595.28;

const LAYOUT_PROFILES = [
    { margin: 16, titleSize: 13.2, sectionSize: 9.2, headerSize: 6.1, bodySize: 4.9, cellPadX: 2.2, cellPadY: 1.35, lineGap: 2.0, sectionGap: 3.2, borderWidth: 0.45 },
    { margin: 14, titleSize: 12.4, sectionSize: 8.8, headerSize: 5.8, bodySize: 4.5, cellPadX: 2.0, cellPadY: 1.2, lineGap: 1.8, sectionGap: 2.8, borderWidth: 0.42 },
    { margin: 12, titleSize: 11.6, sectionSize: 8.3, headerSize: 5.4, bodySize: 4.1, cellPadX: 1.8, cellPadY: 1.05, lineGap: 1.6, sectionGap: 2.4, borderWidth: 0.4 },
    { margin: 10, titleSize: 10.8, sectionSize: 7.8, headerSize: 5.0, bodySize: 3.7, cellPadX: 1.55, cellPadY: 0.95, lineGap: 1.4, sectionGap: 2.1, borderWidth: 0.38 },
    { margin: 8, titleSize: 10.0, sectionSize: 7.2, headerSize: 4.5, bodySize: 3.2, cellPadX: 1.35, cellPadY: 0.85, lineGap: 1.2, sectionGap: 1.9, borderWidth: 0.35 },
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
    let x = 0;
    for (let i = 0; i < columns.length; i += 1) {
        const colWidth = columns[i].weight * tableWidth;
        const text = isHeader ? columns[i].label : textValue(row.cells[i]);
        const textHeight = estimateTextHeight(text, fontSize, Math.max(10, colWidth - profile.cellPadX * 2));
        if (textHeight > maxHeight) maxHeight = textHeight;
        x += colWidth;
    }
    return maxHeight + profile.cellPadY * 2;
}

function estimatePages(report, profile) {
    const contentWidth = A5_WIDTH_PT - profile.margin * 2;
    const pageBottom = A5_HEIGHT_PT - profile.margin;
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
    const pageSetup = { size: "A5", margins: { top: 0, bottom: 0, left: 0, right: 0 } };
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

class OrderController {
    async neworder(req, res) {
        const order = req.body.order;
        const insertText = "INSERT INTO orders(orderjson) VALUES ($1) RETURNING id";
        pool.query(insertText, [order], (err, result) => {
            if (err) {
                res.sendStatus(400);
            } else {
                res.status(202);
                res.send(result.rows[0].id);
            }
        });
    }

    async getallorders(req, res) {
        pool.query("select * from orders ORDER BY id DESC", (err, result) => {
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
        pool.query("delete from orders where id = $1", [id], (err) => {
            if (err) {
                console.error("Error delete order", err.stack);
                res.send("ошибка доступа к базе данных");
            } else {
                res.sendStatus(202);
            }
        });
    }

    async editorder(req, res) {
        const order = req.body.editingOrder;
        pool.query("UPDATE orders SET orderjson = $1 where id = $2", [order, order.id], (err) => {
            if (err) {
                console.error("Error connecting to the database", err.stack);
                res.send("ошибка доступа к базе данных");
            } else {
                res.sendStatus(202);
            }
        });
    }

    async printorder(req, res) {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).send("Некорректный номер заявки");
            return;
        }

        pool.query("select id, orderjson from orders where id = $1", [id], (err, result) => {
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
            const showFinBlock = !!req.body?.rights?.finBlockAccess;
            const report = buildReport(id, order, showFinBlock);
            const profile = pickLayout(report);
            const fonts = resolveFontFamily();

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="order-${id}.pdf"`);
            res.status(200);

            const doc = new PDFDocument({ autoFirstPage: false, size: "A5", margin: 0, compress: true });
            doc.pipe(res);
            renderReport(doc, report, profile, fonts);
            doc.end();
        });
    }
}

module.exports = new OrderController();

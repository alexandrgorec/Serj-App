const fs = require("fs");
const PDFDocument = require("pdfkit");
const { pool } = require("../db");

function parsePositiveInteger(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}

function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
}

function textValue(value) {
    return hasValue(value) ? String(value).trim() : "—";
}

function parseNumberValue(value) {
    if (!hasValue(value)) return null;
    const normalized = String(value).replace(/[\s\u00A0]+/g, "").replace(",", ".");
    if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) return null;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
}

function formatNumberValue(value) {
    const parsed = parseNumberValue(value);
    if (parsed === null) return textValue(value);
    return parsed.toLocaleString("ru-RU", { maximumFractionDigits: 6 });
}

function calculatePriceWithMarkup(price, markup) {
    const parsedPrice = parseNumberValue(price);
    if (parsedPrice === null) return "";
    const parsedMarkup = parseNumberValue(markup) ?? 0;
    return formatNumberValue(parsedPrice + parsedMarkup);
}

function formatPriceDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function formatPriceTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getHours()}.${String(date.getMinutes()).padStart(2, "0")}`;
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

function getMailingData(mailing) {
    const data = mailing?.categories_json;
    if (Array.isArray(data)) return { contactData: "", categories: data };
    return {
        contactData: String(data?.contactData || ""),
        categories: Array.isArray(data?.categories) ? data.categories : [],
    };
}

function getVisibleCategories(mailing) {
    return getMailingData(mailing).categories
        .filter((category) => category?.visible !== false)
        .map((category, index) => ({ category, index, order: parseNumberValue(category?.number) }))
        .sort((a, b) => {
            if (a.order === null && b.order === null) return a.index - b.index;
            if (a.order === null) return 1;
            if (b.order === null) return -1;
            if (a.order === b.order) return a.index - b.index;
            return a.order - b.order;
        })
        .map((item) => item.category);
}

function groupCategoryByProduct(category) {
    const groups = new Map();
    const bases = Array.isArray(category?.bases) ? category.bases : [];
    bases.forEach((basis) => {
        const product = textValue(basis?.product);
        if (!groups.has(product)) groups.set(product, []);
        groups.get(product).push(basis);
    });
    return Array.from(groups.entries()).map(([product, rows]) => ({
        product,
        rows: rows.sort((a, b) => {
            const priceA = parseNumberValue(a?.price);
            const priceB = parseNumberValue(b?.price);
            if (priceA === null && priceB === null) return 0;
            if (priceA === null) return 1;
            if (priceB === null) return -1;
            return priceA - priceB;
        }),
    }));
}

function groupCategoryByProductForClient(category) {
    const groups = new Map();
    const bases = Array.isArray(category?.bases) ? category.bases : [];
    bases.forEach((basis) => {
        const product = textValue(basis?.product);
        const basisName = textValue(basis?.name);
        const priceValue = basis?.priceWithMarkup || calculatePriceWithMarkup(basis?.price, basis?.markup);
        const parsedPrice = parseNumberValue(priceValue);
        if (!groups.has(product)) groups.set(product, new Map());

        const productBases = groups.get(product);
        const current = productBases.get(basisName);
        const currentPrice = current ? parseNumberValue(current.price) : null;
        const shouldReplace = !current ||
            (parsedPrice !== null && currentPrice !== null && parsedPrice < currentPrice) ||
            (parsedPrice !== null && currentPrice === null);

        if (shouldReplace) {
            productBases.set(basisName, {
                basis: basisName,
                price: priceValue,
            });
        }
    });

    return Array.from(groups.entries()).map(([product, basisMap]) => ({
        product,
        rows: Array.from(basisMap.values()).sort((a, b) => {
            const priceA = parseNumberValue(a?.price);
            const priceB = parseNumberValue(b?.price);
            if (priceA === null && priceB === null) return 0;
            if (priceA === null) return 1;
            if (priceB === null) return -1;
            return priceA - priceB;
        }),
    }));
}

function drawCenteredText(doc, text, x, y, width, height, font, fontSize, fillColor = "black") {
    doc.font(font).fontSize(fontSize).fillColor(fillColor);
    const textHeight = doc.heightOfString(text, { width: width - 8, align: "center" });
    doc.text(text, x + 4, y + Math.max(2, (height - textHeight) / 2), {
        width: width - 8,
        align: "center",
        lineBreak: true,
    });
}

function drawMailingCell(doc, { x, y, width, height, text, font, fontSize, align = "center", fill = null, border = "#111" }) {
    if (fill) {
        doc.save().rect(x, y, width, height).fillColor(fill).fill().restore();
    }
    doc.save().lineWidth(1).strokeColor(border).rect(x, y, width, height).stroke().restore();
    doc.font(font).fontSize(fontSize).fillColor("black");
    const textHeight = doc.heightOfString(text, { width: width - 8, align });
    doc.text(text, x + 4, y + Math.max(2, (height - textHeight) / 2), {
        width: width - 8,
        align,
        lineBreak: true,
    });
}

function ensureMailingSpace(doc, state, neededHeight) {
    if (state.y + neededHeight <= state.bottom) return;
    doc.addPage(state.pageSetup);
    state.y = state.margin;
}

function drawProductTable(doc, state, group, x, y, width, fonts, options = {}) {
    const titleHeight = 24;
    const headerHeight = 22;
    const rowHeight = 20;
    const withoutMarkup = !!options.withoutMarkup;
    const headers = withoutMarkup
        ? ["Поставщик", "Базис", "Вход"]
        : ["Поставщик", "Базис", "Вход", "С наценкой"];
    const colWeights = withoutMarkup ? [0.36, 0.34, 0.30] : [0.28, 0.26, 0.23, 0.23];
    const colWidths = colWeights.map((part) => part * width);
    const totalHeight = titleHeight + headerHeight + group.rows.length * rowHeight;

    drawMailingCell(doc, {
        x,
        y,
        width,
        height: titleHeight,
        text: group.product,
        font: fonts.regular,
        fontSize: 12,
        fill: "#d9d9d9",
    });

    let cx = x;
    headers.forEach((label, index) => {
        drawMailingCell(doc, {
            x: cx,
            y: y + titleHeight,
            width: colWidths[index],
            height: headerHeight,
            text: label,
            font: fonts.regular,
            fontSize: 10.5,
            fill: "#d9d9d9",
        });
        cx += colWidths[index];
    });

    group.rows.forEach((basis, rowIndex) => {
        const rowY = y + titleHeight + headerHeight + rowIndex * rowHeight;
        const cells = [
            textValue(basis?.supplier),
            textValue(basis?.name),
            formatNumberValue(basis?.price),
        ];
        if (!withoutMarkup) {
            cells.push(formatNumberValue(basis?.priceWithMarkup || calculatePriceWithMarkup(basis?.price, basis?.markup)));
        }
        cx = x;
        cells.forEach((cell, index) => {
            drawMailingCell(doc, {
                x: cx,
                y: rowY,
                width: colWidths[index],
                height: rowHeight,
                text: cell,
                font: fonts.regular,
                fontSize: 10,
                fill: "#ffffff",
            });
            cx += colWidths[index];
        });
    });

    return totalHeight;
}

function drawClientProductTable(doc, group, x, y, width, fonts) {
    const titleHeight = 24;
    const headerHeight = 22;
    const rowHeight = 20;
    const colWidths = [0.53, 0.47].map((part) => part * width);
    const totalHeight = titleHeight + headerHeight + group.rows.length * rowHeight;

    drawMailingCell(doc, {
        x,
        y,
        width,
        height: titleHeight,
        text: group.product,
        font: fonts.regular,
        fontSize: 12,
        fill: "#d9d9d9",
    });

    let cx = x;
    ["Базис", "Цена"].forEach((label, index) => {
        drawMailingCell(doc, {
            x: cx,
            y: y + titleHeight,
            width: colWidths[index],
            height: headerHeight,
            text: label,
            font: fonts.regular,
            fontSize: 10.5,
            fill: "#d9d9d9",
        });
        cx += colWidths[index];
    });

    group.rows.forEach((row, rowIndex) => {
        const rowY = y + titleHeight + headerHeight + rowIndex * rowHeight;
        const cells = [textValue(row?.basis), formatNumberValue(row?.price)];
        cx = x;
        cells.forEach((cell, index) => {
            drawMailingCell(doc, {
                x: cx,
                y: rowY,
                width: colWidths[index],
                height: rowHeight,
                text: cell,
                font: fonts.regular,
                fontSize: 10,
                fill: "#ffffff",
            });
            cx += colWidths[index];
        });
    });

    return totalHeight;
}

function renderMailingSelfPdf(doc, mailing, options = {}) {
    const fonts = resolveFontFamily();
    const pageSetup = { size: "A4", layout: "landscape", margins: { top: 0, bottom: 0, left: 0, right: 0 } };
    doc.addPage(pageSetup);

    const margin = 28;
    const gap = 36;
    const tableGap = 14;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - margin * 2;
    const tableWidth = (contentWidth - gap) / 2;
    const state = {
        y: margin,
        margin,
        bottom: pageHeight - margin,
        pageSetup,
    };

    const createdAt = mailing?.created_at || new Date().toISOString();
    drawCenteredText(doc, `Прайс ${formatPriceDate(createdAt)}`, margin, state.y, contentWidth, 22, fonts.bold, 17);
    state.y += 22;
    drawCenteredText(doc, `Создано в ${formatPriceTime(createdAt)}`, margin, state.y, contentWidth, 22, fonts.bold, 16);
    state.y += 54;

    const categories = getVisibleCategories(mailing);
    categories.forEach((category) => {
        const groups = groupCategoryByProduct(category);
        if (groups.length === 0) return;

        ensureMailingSpace(doc, state, 34);
        drawMailingCell(doc, {
            x: margin,
            y: state.y,
            width: contentWidth,
            height: 34,
            text: textValue(category?.name),
            font: fonts.regular,
            fontSize: 12,
            fill: "#d9d9d9",
        });
        state.y += 34;

        for (let i = 0; i < groups.length; i += 2) {
            const leftGroup = groups[i];
            const rightGroup = groups[i + 1];
            const leftHeight = 46 + leftGroup.rows.length * 20;
            const rightHeight = rightGroup ? 46 + rightGroup.rows.length * 20 : 0;
            const rowHeight = Math.max(leftHeight, rightHeight);
            ensureMailingSpace(doc, state, rowHeight + tableGap);

            drawProductTable(doc, state, leftGroup, margin, state.y, tableWidth, fonts, options);
            if (rightGroup) {
                drawProductTable(doc, state, rightGroup, margin + tableWidth + gap, state.y, tableWidth, fonts, options);
            }
            state.y += rowHeight + tableGap;
        }

        state.y += 12;
    });
}

function renderMailingClientPdf(doc, mailing) {
    const fonts = resolveFontFamily();
    const pageSetup = { size: "A4", layout: "landscape", margins: { top: 0, bottom: 0, left: 0, right: 0 } };
    doc.addPage(pageSetup);

    const margin = 28;
    const tableGap = 20;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - margin * 2;
    const tableWidth = contentWidth / 4;
    const state = {
        y: margin,
        margin,
        bottom: pageHeight - margin,
        pageSetup,
    };

    const createdAt = mailing?.created_at || new Date().toISOString();
    const data = getMailingData(mailing);
    const managerName = textValue(mailing?.employee_json?.name);
    const contactData = textValue(data.contactData);

    drawCenteredText(doc, "Прайс", margin, state.y, contentWidth, 22, fonts.bold, 17);
    state.y += 22;
    drawCenteredText(doc, `от ${formatPriceDate(createdAt)}`, margin, state.y, contentWidth, 22, fonts.bold, 16);
    state.y += 22;
    drawCenteredText(doc, `Создано в ${formatPriceTime(createdAt)}`, margin, state.y, contentWidth, 22, fonts.bold, 16);

    const managerX = pageWidth - margin - 210;
    doc.font(fonts.bold).fontSize(15).fillColor("black").text("Ваш менеджер:", managerX, margin, { width: 210 });
    doc.font(fonts.regular).fontSize(14).text(managerName, managerX, margin + 25, { width: 210 });
    if (contactData !== "—") {
        doc.font(fonts.regular).fontSize(14).text(contactData, managerX, margin + 48, { width: 210 });
    }

    state.y += 62;

    const categories = getVisibleCategories(mailing);
    categories.forEach((category) => {
        const groups = groupCategoryByProductForClient(category);
        if (groups.length === 0) return;

        ensureMailingSpace(doc, state, 34);
        drawMailingCell(doc, {
            x: margin,
            y: state.y,
            width: contentWidth,
            height: 34,
            text: textValue(category?.name),
            font: fonts.regular,
            fontSize: 12,
            fill: "#d9d9d9",
        });
        state.y += 34;

        for (let i = 0; i < groups.length; i += 4) {
            const rowGroups = groups.slice(i, i + 4);
            const rowHeight = Math.max(...rowGroups.map((group) => 46 + group.rows.length * 20));
            ensureMailingSpace(doc, state, rowHeight + tableGap);

            rowGroups.forEach((group, groupIndex) => {
                drawClientProductTable(doc, group, margin + groupIndex * tableWidth, state.y, tableWidth, fonts);
            });
            state.y += rowHeight + tableGap;
        }

        state.y += 12;
    });
}

class MailingController {
    async savemailing(req, res) {
        const id = parsePositiveInteger(req.body?.id);
        const employeeJson = {
            id: req.body?.userId,
            name: req.body?.user || '',
        };
        const categoriesJson = req.body?.categories_json || { contactData: '', categories: [] };

        try {
            if (id) {
                const result = await pool.query(`
                    UPDATE mailings
                    SET employee_json = $1, categories_json = $2
                    WHERE id = $3
                    RETURNING id, created_at, employee_json, categories_json
                `, [employeeJson, categoriesJson, id]);

                if (result.rows.length === 0) {
                    res.status(404).json({ message: "Рассылка не найдена" });
                    return;
                }

                res.status(202).json({ mailing: result.rows[0] });
                return;
            }

            const result = await pool.query(`
                INSERT INTO mailings(employee_json, categories_json)
                VALUES ($1, $2)
                RETURNING id, created_at, employee_json, categories_json
            `, [employeeJson, categoriesJson]);

            res.status(202).json({ mailing: result.rows[0] });
        } catch (err) {
            console.error("Error save mailing", err.stack || err);
            res.status(400).json({ message: "ошибка доступа к базе данных" });
        }
    }

    async getallmailings(req, res) {
        try {
            const result = await pool.query(`
                SELECT id, created_at, employee_json, categories_json
                FROM mailings
                ORDER BY id DESC
            `);
            res.status(202).json({ mailings: result.rows });
        } catch (err) {
            console.error("Error get mailings", err.stack || err);
            res.status(400).json({ message: "ошибка доступа к базе данных" });
        }
    }

    async deletemailing(req, res) {
        const id = parsePositiveInteger(req.body?.id);
        if (!id) {
            res.status(400).json({ message: "Некорректный номер рассылки" });
            return;
        }

        try {
            await pool.query("DELETE FROM mailings WHERE id = $1", [id]);
            res.sendStatus(202);
        } catch (err) {
            console.error("Error delete mailing", err.stack || err);
            res.status(400).json({ message: "ошибка доступа к базе данных" });
        }
    }

    async printmailingself(req, res) {
        const id = parsePositiveInteger(req.params?.id);
        if (!id) {
            res.status(400).send("Некорректный номер рассылки");
            return;
        }

        try {
            const result = await pool.query(`
                SELECT id, created_at, employee_json, categories_json
                FROM mailings
                WHERE id = $1
            `, [id]);

            if (!result.rows[0]) {
                res.status(404).send("Рассылка не найдена");
                return;
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="mailing-${id}-self.pdf"`);
            res.status(200);

            const doc = new PDFDocument({ autoFirstPage: false, size: "A4", layout: "landscape", margin: 0, compress: true });
            doc.pipe(res);
            renderMailingSelfPdf(doc, result.rows[0], { withoutMarkup: req.query?.withoutMarkup === "1" });
            doc.end();
        } catch (err) {
            console.error("Error print mailing self", err.stack || err);
            res.status(400).send("ошибка доступа к базе данных");
        }
    }

    async printmailingclient(req, res) {
        const id = parsePositiveInteger(req.params?.id);
        if (!id) {
            res.status(400).send("Некорректный номер рассылки");
            return;
        }

        try {
            const result = await pool.query(`
                SELECT id, created_at, employee_json, categories_json
                FROM mailings
                WHERE id = $1
            `, [id]);

            if (!result.rows[0]) {
                res.status(404).send("Рассылка не найдена");
                return;
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="mailing-${id}-client.pdf"`);
            res.status(200);

            const doc = new PDFDocument({ autoFirstPage: false, size: "A4", layout: "landscape", margin: 0, compress: true });
            doc.pipe(res);
            renderMailingClientPdf(doc, result.rows[0]);
            doc.end();
        } catch (err) {
            console.error("Error print mailing client", err.stack || err);
            res.status(400).send("ошибка доступа к базе данных");
        }
    }
}

module.exports = new MailingController();

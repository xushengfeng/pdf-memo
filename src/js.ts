/// <reference types="vite/client" />

import { el, text, setStyle } from "redom";

import localforage from "localforage";
import { extendPrototype } from "localforage-setitems";
extendPrototype(localforage);

import * as zip from "@zip.js/zip.js";

var pdfjsLib = window["pdfjsLib"] as typeof import("pdfjs-dist");
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs";

import "@oddbird/popover-polyfill";

import { Card, createEmptyCard, generatorParameters, FSRS, Rating, State } from "ts-fsrs";

import pen_svg from "../assets/icons/pen.svg";
import ok_svg from "../assets/icons/ok.svg";
import very_ok_svg from "../assets/icons/very_ok.svg";
import help_svg from "../assets/icons/help.svg";
import close_svg from "../assets/icons/close.svg";
import add_svg from "../assets/icons/add.svg";
import chart_svg from "../assets/icons/chart.svg";
import githubIcon from "../assets/other/Github.svg";

function icon(src: string) {
    return `<img src="${src}" class="icon">`;
}
function iconEl(src: string) {
    return el("img", { src, class: "icon", alt: "按钮图标" });
}

function uuid() {
    if (crypto.randomUUID) {
        return crypto.randomUUID().slice(0, 8);
    } else {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0,
                v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16).slice(0, 8);
        });
    }
}

function time() {
    return new Date().getTime();
}

if ("serviceWorker" in navigator) {
    if (import.meta.env.PROD) {
        navigator.serviceWorker.register("/sw.js");
    }
}

var setting = localforage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

/************************************UI */

navigator?.storage?.persist();

document.body.translate = false;

let learnLang = "en";

document.getElementById("main").lang = learnLang;

const menuEl = document.getElementById("menu");
let willShowMenu = false;
function showMenu(x: number, y: number) {
    menuEl.style.left = x + "px";
    menuEl.style.top = y + "px";
    willShowMenu = true;
    menuEl.onclick = () => menuEl.hidePopover();
}

document.body.addEventListener("pointerup", (e) => {
    if (willShowMenu) {
        menuEl.showPopover();
        willShowMenu = false;
    }
});

function interModal(message?: string, iel?: HTMLElement, cancel?: boolean) {
    let dialog = document.createElement("dialog");
    dialog.className = "interModal";
    let me = document.createElement("span");
    let cancelEl = document.createElement("button");
    cancelEl.innerText = "取消";
    cancelEl.classList.add("cancel_b");
    let okEl = document.createElement("button");
    okEl.innerText = "确定";
    okEl.classList.add("ok_b");
    me.innerText = message ?? "";
    dialog.append(me);
    if (iel) {
        dialog.append(iel);
        iel.style.gridArea = "2 / 1 / 3 / 3";
    }
    if (cancel) dialog.append(cancelEl);
    dialog.append(okEl);
    document.body.append(dialog);
    dialog.showModal();
    return new Promise((re: (name: string | boolean) => void, rj) => {
        okEl.onclick = () => {
            re(iel ? iel.querySelector("input").value : true);
            dialog.close();
        };
        cancelEl.onclick = () => {
            re(null);
            dialog.close();
        };
        dialog.onclose = () => {
            dialog.remove();
        };
        dialog.oncancel = () => {
            re(null);
        };
    });
}

async function alert(message: string) {
    return await interModal(message, null);
}

async function confirm(message: string) {
    return Boolean(await interModal(message, null, true));
}

async function prompt(message?: string, defaultValue?: string) {
    return (await interModal(message, el("input", { value: defaultValue || "" }), true)) as string;
}

function dialogX(el: HTMLDialogElement) {
    document.body.append(el);
    el.showModal();
    el.addEventListener("close", () => {
        el.remove();
    });
}

function vlist<ItemType>(
    pel: HTMLElement,
    list: ItemType[],
    style: {
        iHeight: number;
        gap?: number;
        paddingTop?: number;
        paddingLeft?: number;
        paddingBotton?: number;
        paddingRight?: number;
        width?: string;
    },
    f: (index: number, item: ItemType, remove: () => void) => HTMLElement | Promise<HTMLElement>
) {
    let iHeight = style.iHeight;
    let gap = style.gap ?? 0;
    // padding 还需要pel自己设定
    let paddingTop = style.paddingTop ?? 0;
    let paddingLeft = style.paddingLeft ?? 0;
    let paddingBotton = style.paddingBotton ?? 0;

    let blankEl = el("div", {
        style: { width: "1px", position: "absolute", top: "0" },
    });
    const setBlankHeight = (len: number) =>
        (blankEl.style.height = iHeight * len + gap * len + paddingTop + paddingBotton + "px");
    setBlankHeight(list.length);
    pel.append(blankEl);
    const dataI = "data-v-i";
    async function show(newList?: any[]) {
        if (newList) {
            list = newList;
            setBlankHeight(list.length);
        }
        let startI = Math.ceil((pel.scrollTop - paddingTop) / (iHeight + gap));
        let endI = Math.floor((pel.scrollTop - paddingTop + pel.offsetHeight) / (iHeight + gap));
        let buffer = Math.min(Math.floor((endI - startI) / 3), 15);
        startI -= buffer;
        endI += buffer;
        startI = Math.max(0, startI);
        endI = Math.min(list.length - 1, endI);
        if (list.length < 100 && !newList) {
            startI = 0;
            endI = list.length - 1;
            if (pel.querySelectorAll(`:scope > [${dataI}]`).length === list.length) return;
        }
        let oldRangeList: number[] = [];
        pel.querySelectorAll(`:scope > [${dataI}]`).forEach((el: HTMLElement) => {
            oldRangeList.push(Number(el.getAttribute(dataI)));
        });
        for (let i of oldRangeList) {
            if (i < startI || endI < i || newList) pel.querySelector(`:scope > [${dataI}="${i}"]`).remove();
        }
        for (let i = startI; i <= endI; i++) {
            let iel = await f(i, list[i], () => {
                list = list.toSpliced(i, 1);
                show(list);
            });
            setStyle(iel, {
                position: "absolute",
                top: paddingTop + i * (iHeight + gap) + "px",
                left: paddingLeft + "px",
                ...(style.width ? { width: style.width } : {}),
            });
            iel.setAttribute(dataI, String(i));
            if (!pel.querySelector(`:scope > [${dataI}="${i}"]`) || newList) pel.append(iel);
        }
    }
    show();
    function s() {
        requestAnimationFrame(() => show());
    }
    pel.addEventListener("scroll", s);

    const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList" && Array.from(mutation.removedNodes).includes(blankEl)) {
                pel.removeEventListener("scroll", s);
            }
        }
    });
    observer.observe(pel, { childList: true });
    return { show };
}

/************************************main */
const TODOMARK = "to_visit";
const AIDIALOG = "ai_dialog";
const SELECTEDITEM = "selected_item";

const booksEl = document.getElementById("books") as HTMLDialogElement;
const localBookEl = el("div", { class: "books" });
const onlineBookEl = el("div", { class: "books", style: { display: "none" } });
booksEl.append(
    el("div", { style: { display: "flex" } }, [
        el("div", "本地书籍", {
            onclick: () => {
                showBooks();
                booksEl.classList.remove("show_online_book");
            },
        }),
        el("button", iconEl(close_svg), {
            style: { "margin-left": "auto" },
            onclick: () => {
                booksEl.close();
            },
        }),
    ]),
    localBookEl,
    onlineBookEl
);
const bookSectionsEl = el("div", {
    style: {
        overflow: "scroll",
        position: "relative",
        "flex-grow": "1",
    },
});
const bookBEl = document.getElementById("books_b");
const addBookEl = el("div", iconEl(add_svg));
const addSectionEL = el("div", iconEl(add_svg));
const bookNameEl = el("div");
const bookNavEl = document.getElementById("book_nav");
bookNavEl.append(bookNameEl, addSectionEL, bookSectionsEl);
let bookContentEl = document.getElementById("book_content");
const bookContentContainerEl = bookContentEl.parentElement;
const changeStyleBar = el("div", { popover: "auto", class: "change_style_bar" });
document.body.append(changeStyleBar);
const changeEditEl = document.getElementById("change_edit");

function putToast(ele: HTMLElement, time?: number) {
    let toastEl = document.body.querySelector(".toast") as HTMLElement;
    if (!toastEl) {
        toastEl = el("div", { class: "toast", popover: "auto" });
        document.body.append(toastEl);
    }
    toastEl.showPopover();
    toastEl.append(ele);

    if (time === undefined) time = 2000;
    if (time) {
        setTimeout(() => {
            ele.remove();
        }, time);
    }

    const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === "childList" && toastEl.childElementCount === 0) {
                toastEl.remove();
                observer.disconnect();
            }
        }
    });
    observer.observe(toastEl, { childList: true });
}

const tmpDicEl = el("div", { popover: "auto", class: "tmp_dic" });
document.body.append(tmpDicEl);

var bookshelfStore = localforage.createInstance({ name: "bookshelf" });
var fileStore = localforage.createInstance({ name: "file" });

type book = {
    name: string;
    shortName?: string;
    id: string;
    visitTime: number;
    updateTime: number;
    cover?: string;
    author?: string;
    chapters: chapter[];
    lastPosi: number;
    pdf: string;
};
type chapter = {
    id: string;
    title: string;
    pages: number[];
    lastPage: number;
    cardId: string;
};

async function getBooksById(id: string) {
    return (await bookshelfStore.getItem(id)) as book;
}
function getSection(book: book, id: number) {
    return book.chapters[id];
}

async function getBookShortTitle(bookId: string) {
    return (await getBooksById(bookId)).shortName || (await getBooksById(bookId)).name;
}

async function getTitle(bookId: string, sectionN: number, x?: string) {
    let section = getSection(await getBooksById(bookId), sectionN);
    const t = `${await getBookShortTitle(bookId)}${x || " - "}${section.title}`;
    return t;
}

async function getTitleEl(bookId: string, sectionN: number, x?: string) {
    const title = await getTitle(bookId, sectionN, x);
    return el("span", { class: "source_title" }, title);
}

async function newBook() {
    let id = uuid();
    const fileId = uuid();
    let book: book = {
        name: "新书",
        id: id,
        visitTime: 0,
        updateTime: 0,
        chapters: [newSection()],
        pdf: fileId,
        lastPosi: 0,
    };
    bookshelfStore.setItem(id, book);
    return new Promise<{ book: string; chapterI: 0 }>((resolve, reject) => {
        const x = el("input", {
            type: "file",
            onchange: async () => {
                await fileStore.setItem(fileId, x.files[0]);
                resolve({ book: id, chapterI: 0 });
            },
        });
        x.click();
    });
}

function newSection() {
    let s: chapter = { title: "新章节", id: uuid(), lastPage: 0, cardId: "", pages: [] };
    return s;
}

bookBEl.onclick = () => {
    booksEl.showModal();
};

addBookEl.onclick = async () => {
    let b = await newBook();
    nowBook = b;
    let book = await getBooksById(nowBook.book);
    showBook(book);
    changeEdit(true);
    booksEl.close();
};

addSectionEL.onclick = async () => {
    if (nowBook.book === "0") return;
    if (!nowBook.book) return;
    let book = await getBooksById(nowBook.book);
    let s = newSection();
    book.chapters.push(s);
    book.lastPosi = book.chapters.length - 1;
    await bookshelfStore.setItem(nowBook.book, book);
    nowBook.chapterI = book.chapters.length - 1;
    showBook(book);
    changeEdit(true);
};

document.getElementById("book_sections").onclick = () => {
    bookNavEl.classList.toggle("book_nav_show");
};

let nowBook = {
    book: "",
    chapterI: NaN,
};

let isWordBook = false;

showBooks();
setBookS();

async function setSectionTitle() {
    const book = await getBooksById(nowBook.book);
    const title = getSection(book, nowBook.chapterI).title;
    let titleEl = el("input", { style: { "font-size": "inherit" } });
    titleEl.value = title;
    titleEl.select();
    const iel = el("div");
    iel.append(titleEl);
    titleEl.focus();
    const nTitle = (await interModal("重命名章节标题", iel, true)) as string;
    if (!nTitle) return;
    book.chapters[nowBook.chapterI].title = nTitle;
    await bookshelfStore.setItem(nowBook.book, book);
    if (!isWordBook) bookContentEl.querySelector("h1").innerText = nTitle;
    setBookS();
    return nTitle;
}

async function setBookS() {
    if (nowBook.book) {
        const book = await getBooksById(nowBook.book);
        bookNameEl.innerText = book.name;
        let sectionId = nowBook.chapterI;
    }
}

function bookEl(name: string, cover: HTMLCanvasElement) {
    let bookIEl = el("div");
    let titleEl = el("span");
    titleEl.innerText = name;
    bookIEl.append(cover, titleEl);
    return bookIEl;
}

async function showBooks() {
    localBookEl.innerHTML = "";
    localBookEl.append(addBookEl);
    let bookList: book[] = [];
    await bookshelfStore.iterate((book: book) => {
        bookList.push(book);
    });
    bookList = bookList.toSorted((a, b) => b.visitTime - a.visitTime);
    for (let book of bookList) {
        let bookIEl: HTMLDivElement;

        const fileId = book.pdf;
        const file = (await fileStore.getItem(fileId)) as Blob;
        const loadingTask = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;

        const pel = el("div");
        const p = await loadingTask.getPage(1);
        const ifr = await showPdf(p);
        pel.append(ifr);
        bookIEl = bookEl(book.name, ifr);

        localBookEl.append(bookIEl);
        const id = book.id;
        bookIEl.onclick = async () => {
            const book = await getBooksById(id);
            showBook(book);
            book.visitTime = new Date().getTime();
            bookshelfStore.setItem(book.id, book);
            booksEl.close();
        };
        bookIEl.oncontextmenu = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const book = await getBooksById(id);
            menuEl.innerHTML = "";
            let renameEl = document.createElement("div");
            renameEl.innerText = "重命名";
            renameEl.onclick = async () => {
                let name = await prompt("更改书名", book.name);
                if (name) {
                    bookIEl.querySelector("span").innerText = name;
                    if (bookIEl.innerText) bookIEl.querySelector("div").innerText = name;
                    book.name = name;
                    bookshelfStore.setItem(book.id, book);
                    setBookS();
                }
            };
            let editMetaEl = el("div", "元数据", {
                onclick: () => {
                    let formEl = el("form", [el("input", { name: "name", value: book.name })]);
                    let submitEl = el("button", "确定");
                    let metaEl = el("dialog", [el("div", `id: ${book.id}`), formEl, submitEl]) as HTMLDialogElement;
                    submitEl.onclick = () => {
                        let data = new FormData(formEl);
                        data.forEach((v, k) => {
                            book[k] = v;
                        });
                        bookshelfStore.setItem(book.id, book);
                        metaEl.close();
                        setBookS();
                    };
                    dialogX(metaEl);
                },
            });
            menuEl.append(renameEl, editMetaEl);
            showMenu(e.clientX, e.clientY);
        };
    }
}
function showBook(book: book) {
    nowBook.book = book.id;
    nowBook.chapterI = book.lastPosi;
    showBookSections(book);
    showBookContent(book, book.chapters[book.lastPosi].id);
    setBookS();
}
async function showBookSections(book: book) {
    const sections = structuredClone(book.chapters);
    bookSectionsEl.innerHTML = "";
    vlist(bookSectionsEl, sections, { iHeight: 24, paddingTop: 16, paddingLeft: 16 }, async (i) => {
        let sEl = el("div");
        let s = sections[i];
        sEl.innerText = sEl.title = s.title || `章节${Number(i) + 1}`;
        if (nowBook.chapterI === i) sEl.classList.add(SELECTEDITEM);
        sEl.onclick = async () => {
            sEl.classList.remove(TODOMARK);

            bookSectionsEl.querySelector(`.${SELECTEDITEM}`).classList.remove(SELECTEDITEM);
            sEl.classList.add(SELECTEDITEM);

            nowBook.chapterI = i;
            showBookContent(book, sections[i].id);
            setBookS();
            book.lastPosi = Number(i);
            bookshelfStore.setItem(nowBook.book, book);
        };
        sEl.oncontextmenu = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            menuEl.innerHTML = "";
            menuEl.append(
                el("div", "重命名", {
                    onclick: async () => {
                        const t = await setSectionTitle();
                        if (t) sEl.innerText = t;
                    },
                })
            );

            showMenu(e.clientX, e.clientY);
        };
        return sEl;
    });
}

async function showBookContent(book: book, chapter: string) {
    bookContentContainerEl.innerHTML = "";

    const x = await showNormalBook(book, chapter);
    bookContentEl = x;
    bookContentContainerEl.append(x);
}

type chapterSrc = {
    book: string;
    id: string;
};

async function showNormalBook(book: book, chapter: string) {
    const s = book.chapters.find((i) => i.id === chapter);
    const cel = el("div");

    const fileId = book.pdf;
    const file = (await fileStore.getItem(fileId)) as Blob;

    const loadingTask = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;

    cel.append(
        el("h1", s.title, {
            onclick: () => {
                setSectionTitle();
            },
        })
    );

    const pel = el("div");
    for (let page of s.pages) {
        const p = await loadingTask.getPage(page);
        const ifr = await showPdf(p);
        pel.append(ifr);
    }
    if (!s.cardId || !cardsStore.getItem(s.cardId)) {
        const add = el("button", iconEl(add_svg), {
            onclick: async () => {
                const cardId = uuid();
                s.cardId = cardId;
                const card = createEmptyCard();
                cardsStore.setItem(cardId, card);
                let book = await getBooksById(nowBook.book);
                let sectionId = nowBook.chapterI;
                book.chapters[sectionId] = s;
                book.updateTime = new Date().getTime();
                await bookshelfStore.setItem(nowBook.book, book);

                await card2chapter.setItem(cardId, { book: nowBook.book, id: s.id } as chapterSrc);

                newCardAction(cardId);

                add.remove();
            },
        });
        cel.append(add);
    }
    cel.append(pel);
    return cel;
}

async function showPdf(page: PDFPageProxy) {
    let scale = 1;
    let viewport = page.getViewport({ scale: scale });

    let canvas = el("canvas");
    let context = canvas.getContext("2d");

    let cw = viewport.width * scale,
        ch = viewport.height * scale;

    let scalex = viewport.width;
    let scaley = viewport.height;

    canvas.width = Math.round(cw);
    canvas.height = Math.round(ch);

    let transform = null;

    let renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport,
    };
    let task = page.render(renderContext);
    return canvas;
}

let isEdit = false;
let editPages: number[] = [];

async function changeEdit(b: boolean) {
    isEdit = b;
    if (isEdit) {
        changeEditEl.innerHTML = icon(ok_svg);
        return setEdit();
    } else {
        let newC = el("div");
        bookContentContainerEl.innerHTML = "";
        bookContentContainerEl.append(newC);
        bookContentEl = newC;
        if (nowBook.book) {
            let book = await getBooksById(nowBook.book);
            let sectionId = nowBook.chapterI;
            book.chapters[sectionId].pages = structuredClone(editPages);
            book.updateTime = new Date().getTime();
            await bookshelfStore.setItem(nowBook.book, book);
            showBookContent(book, book.chapters[sectionId].id);
        }
        changeEditEl.innerHTML = icon(pen_svg);
    }
}
changeEditEl.onclick = () => {
    isEdit = !isEdit;
    changeEdit(isEdit);
};

changeEdit(false);

async function setEdit() {
    let book = await getBooksById(nowBook.book);
    let id = nowBook.chapterI;
    let chapter = getSection(book, id);
    bookContentContainerEl.innerHTML = "";
    const startEl = el("input", {
        type: "number",
        value: chapter.pages[0],
        oninput: () => {
            setPage();
        },
    });
    const endEl = el("input", {
        type: "number",
        value: chapter.pages.at(-1),
        oninput: () => {
            setPage();
        },
    });
    function setPage() {
        editPages = [];
        const start = Number(startEl.value);
        const end = Number(endEl.value);
        for (let i = start; i <= end; i++) {
            editPages.push(i);
        }
    }
    bookContentContainerEl.append(startEl, endEl);

    return text;
}

function textAi(text: string) {
    let l = text.split("\n");
    let index = 0;
    const ignoreMark = "//";
    const userMark = ">";
    const aiMark = "ai:";
    let aiM: aim = [];
    for (let i of l) {
        if (i.startsWith(aiMark)) {
            aiM.push({ role: "assistant", content: i.replace(aiMark, "").trim() });
        } else if (i.startsWith(userMark)) {
            aiM.push({ role: "user", content: i.replace(userMark, "").trim() });
        } else if (i.startsWith(ignoreMark)) {
            index += i.length + 1;
            continue;
        } else {
            if (aiM.length) aiM.at(-1).content += "\n" + i;
        }
        index += i.length + 1;
    }
    if (aiM.length === 0) return [];
    if (aiM.at(-1).role !== "user") return [];
    return aiM;
}

function tmpAi(mainTextEl: HTMLTextAreaElement, info: string, x: number, y: number) {
    let textEl = el("textarea", { value: ">" });
    textEl.onkeyup = async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            let text = textEl.value.trim();
            let aiM = textAi(text);
            if (aiM.at(-1).role != "user") return;
            if (info) aiM.unshift({ role: "system", content: info });
            console.log(aiM);
            let start = textEl.selectionStart;
            let end = textEl.selectionEnd;
            let aitext = await ai(aiM, "对话").text;
            let addText = `ai:\n${aitext}`;
            let changeText = textEl.value.slice(0, start) + addText + textEl.value.slice(end);
            textEl.value = changeText;
            textEl.selectionStart = start;
            textEl.selectionEnd = start + addText.length;
        }
    };
    let div = el("dialog", { class: AIDIALOG }, [
        textEl,
        el("div", { style: { display: "flex", "justify-content": "flex-end" } }, [
            el("button", iconEl(ok_svg), {
                onclick: () => {
                    let mean = textEl.value.trim();
                    div.close();
                    if (mean != ">") mainTextEl.setRangeText("\n" + mean);
                },
            }),
        ]),
    ]) as HTMLDialogElement;
    div.style.left = `min(100vw - 400px, ${x}px)`;
    div.style.top = `min(100dvh - 400px, ${y}px - 400px)`;
    dialogX(div);
}

type aim = { role: "system" | "user" | "assistant"; content: string }[];

function ai(m: aim, text?: string) {
    let config = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        top_p: 1,
        frequency_penalty: 1,
        presence_penalty: 1,
        messages: m,
    };
    let userConfig = localStorage.getItem("setting/ai.config");
    if (userConfig) {
        let c = (JSON.parse(userConfig).messages = m);
        userConfig = JSON.stringify(c);
    } else {
        userConfig = JSON.stringify(config);
    }
    let abort = new AbortController();
    let stopEl = el("button", iconEl(close_svg));
    stopEl.onclick = () => {
        abort.abort();
        pel.remove();
    };
    let pel = el("div", [el("p", `AI正在思考${text || ""}`), stopEl]);
    putToast(pel, 0);
    return {
        stop: abort,
        text: new Promise(async (re: (text: string) => void, rj: (err: Error) => void) => {
            fetch(((await setting.getItem("ai.url")) as string) || `https://api.openai.com/v1/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${(await setting.getItem("ai.key")) as string}`,
                    "content-type": "application/json",
                },
                body: userConfig,
                signal: abort.signal,
            })
                .then((v) => {
                    pel.remove();
                    return v.json();
                })
                .then((t) => {
                    let answer = t.choices[0].message.content;
                    console.log(answer);
                    re(answer);
                })
                .catch((e) => {
                    if (e.name === "AbortError") {
                        pel.remove();
                        return;
                    }
                    pel.innerHTML = "";
                    let escEl = el("button", iconEl(close_svg));
                    escEl.onclick = () => {
                        pel.remove();
                    };
                    pel.append(el("p", `AI处理${text || ""}时出现错误`), el("div", [escEl]));
                    rj;
                });
        }),
    };
}

let checkVisit = {
    section: "",
    time: 0,
};

const fsrsW = JSON.parse(await setting.getItem("fsrs.w")) as number[];
let fsrs = new FSRS(generatorParameters(fsrsW?.length === 17 ? { w: fsrsW } : {}));

var cardsStore = localforage.createInstance({ name: "review", storeName: "cards" });
var card2chapter = localforage.createInstance({ name: "review", storeName: "card2chapter" });
var cardActionsStore = localforage.createInstance({ name: "review", storeName: "actions" });
function setCardAction(cardId: string, time: Date, rating: Rating, state: State, duration: number) {
    cardActionsStore.setItem(String(time.getTime()), {
        cardId,
        rating,
        state,
        duration,
    });
}
function newCardAction(id: string) {
    setCardAction(id, new Date(), null, null, null);
}

setTimeout(async () => {
    let d = await getFutureReviewDue(0.1);
    let c = 0;
    c += Object.keys(d).length;
    if (c > 0) reviewBEl.classList.add(TODOMARK);
}, 10);

const reviewBEl = document.getElementById("reviewb");
const reviewEl = document.getElementById("review");
reviewBEl.onclick = () => {
    reviewEl.classList.toggle("review_show");
    reviewBEl.classList.remove(TODOMARK);

    reviewCount = 0;
};

const reviewReflashEl = document.getElementById("review_reflash");
const reviewViewEl = document.getElementById("review_view");
reviewReflashEl.parentElement.append(
    el("button", iconEl(chart_svg), {
        onclick: () => {
            plotEl.showPopover();
            renderCharts();
        },
    })
);

async function getFutureReviewDue(days: number) {
    let now = new Date().getTime();
    now += days * 24 * 60 * 60 * 1000;
    now = Math.round(now);
    let list: { id: string; card: Card }[] = [];

    await cardsStore.iterate((card: Card, k) => {
        if (card.due.getTime() < now) {
            list.push({ id: k, card: card });
        }
    });
    return list;
}
async function getReviewDue() {
    let now = new Date().getTime();
    let list: { id: string; card: Card }[] = [];
    for (let i of due) {
        if (i.card.due.getTime() < now) {
            list.push(i);
        }
    }
    list.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    return list[0];
}

let due: {
    id: string;
    card: Card;
}[] = [];

let reviewCount = 0;
const maxReviewCount = Number((await setting.getItem("review.maxCount")) || "30");

async function nextDue() {
    let x = await getReviewDue();
    reviewCount++;
    return x;
}

reviewReflashEl.onclick = async () => {
    due = await getFutureReviewDue(0.1);
    let l = await getReviewDue();
    console.log(l);
    showReview(l);
    reviewCount = 0;
};

async function showReview(x: { id: string; card: Card }) {
    if (!x) {
        reviewViewEl.innerText = "暂无复习🎉";
        return;
    }
    if (maxReviewCount > 0 && reviewCount === maxReviewCount) {
        reviewViewEl.innerText = `连续复习了${maxReviewCount}个项目，休息一下😌\n刷新即可继续复习`;
        return;
    }
    showWordReview(x);
}
async function showWordReview(x: { id: string; card: Card }) {
    let wordid = (await card2chapter.getItem(x.id)) as chapterSrc;
    let div = el("div");
    const b = await getBooksById(wordid.book);

    let buttons = getReviewCardButtons(x.id, x.card, async (rating) => {
        let next = await nextDue();
        showReview(next);
    });

    const vEl = await showNormalBook(b, wordid.id);
    div.append(vEl, buttons.buttons);
    reviewViewEl.innerHTML = "";
    reviewViewEl.append(div);
}

var reviewHotkey: { [key: string]: { f: () => void; key: string } } = {
    1: { key: "1", f: () => {} },
    2: { key: "2", f: () => {} },
    3: { key: "3", f: () => {} },
    4: { key: "4", f: () => {} },
    show: { key: " ", f: () => {} },
};

document.addEventListener("keydown", (e) => {
    if (!reviewEl.classList.contains("review_show")) return;
    for (let i in reviewHotkey) {
        if (e.key === reviewHotkey[i].key) {
            reviewHotkey[i].f();
        }
    }
});

function getReviewCardButtons(id: string, card: Card, f: (rating: number) => void) {
    const showTime = new Date().getTime();
    let finishTime = showTime;
    let b = (rating: Rating, icon: HTMLElement) => {
        let button = el("button");
        button.append(icon);
        button.onclick = reviewHotkey[rating].f = async () => {
            await setReviewCard(id, card, rating, finishTime - showTime);
            f(rating);
        };
        return button;
    };
    let againB = b(Rating.Again, iconEl(close_svg));
    let hardB = b(Rating.Hard, iconEl(help_svg));
    let goodB = b(Rating.Good, iconEl(ok_svg));
    let veryGoodB = b(Rating.Easy, iconEl(very_ok_svg));
    let buttons = el("div", { class: "review_buttons" });
    buttons.append(againB, hardB, goodB, veryGoodB);
    return {
        buttons,
    };
}

async function setReviewCard(id: string, card: Card, rating: Rating, duration: number) {
    let now = new Date();
    setCardAction(id, now, rating, card.state, duration);
    let sCards = fsrs.repeat(card, now);
    const nCard = sCards[rating].card;
    await cardsStore.setItem(id, nCard);
}

const plotEl = el("div", { popover: "auto", class: "plot" });
document.body.append(plotEl);

async function renderCharts() {
    plotEl.innerHTML = "";
    const cardDue = el("div");
    const due: number[] = [];
    await cardsStore.iterate((v: Card, k: string) => {
        due.push(v.due.getTime());
    });

    cardDue.append(renderCardDue("", due));
    plotEl.append(cardDue);

    const newCard: Date[] = [];
    const reviewCard: Date[] = [];
    await cardActionsStore.iterate(
        (
            v: {
                cardId: string;
                rating: Rating;
                state: State;
                duration: number;
            },
            k
        ) => {
            const date = new Date(Number(k));
            if (!v.rating) {
                newCard.push(date);
            } else {
                reviewCard.push(date);
            }
        }
    );
    const cal = renderCal(2024, newCard);
    const cal1 = renderCal(2024, reviewCard);
    plotEl.append(el("div", [el("h2", "新卡片"), cal, el("h2", "已复习"), cal1]));
}

function renderCardDue(text: string, data: number[]) {
    const pc = el("div", { class: "oneD_plot" });
    const now = time();
    const zoom = 1 / ((1000 * 60 * 60) / 10);
    let _max = -Infinity,
        _min = Infinity;
    data.concat([now]).forEach((d) => {
        if (d > _max) _max = d;
        if (d < _min) _min = d;
    });
    let count = 0;
    for (let min = _min; min < _max; min += 2048 / zoom) {
        const max = Math.min(min + 2048 / zoom, _max);
        const canvas = el("canvas");
        canvas.width = (max - min) * zoom;
        if (max === _max) canvas.width++;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        function l(x: number, color: string) {
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 16);
            ctx.stroke();
        }
        const nowx = (now - min) * zoom;
        data.forEach((d) => {
            if (d < min || max < d) return;
            const x = (d - min) * zoom;
            l(x, "#000");
            if (x < nowx) count++;
        });
        l(nowx, "#f00");
        l((now + 1000 * 60 * 60 - min) * zoom, "#00f");
        l((now + 1000 * 60 * 60 * 24 - min) * zoom, "#00f");
        pc.append(canvas);
    }
    const f = el("div");
    f.append(text, String(count), pc);
    return f;
}

function renderCal(year: number, data: Date[]) {
    const count: { [key: string]: number } = {};
    for (let d of data) {
        const id = d.toDateString();
        if (count[id]) count[id]++;
        else count[id] = 1;
    }
    const max = Math.max(...Object.values(count));
    const div = el("div");
    const firstDate = new Date(year, 0, 1);
    const zero2first = (firstDate.getDay() + 1) * 24 * 60 * 60 * 1000;
    let s_date = new Date(firstDate.getTime() - zero2first);
    const f = el("div", { class: "cal_plot" });
    const title = el("div");
    for (let x = 1; x <= 53; x++) {
        for (let y = 1; y <= 7; y++) {
            s_date = new Date(s_date.getTime() + 24 * 60 * 60 * 1000);
            const v = (count[s_date.toDateString()] ?? 0) / max;
            const item = el("div");
            item.title = `${s_date.toLocaleDateString()}  ${count[s_date.toDateString()] ?? 0}`;
            if (v) item.style.backgroundColor = `color-mix(in srgb-linear, #9be9a8, #216e39 ${v * 100}%)`;
            if (s_date.toDateString() === new Date().toDateString()) {
                item.style.borderWidth = "2px";
                title.innerText = item.title;
            }
            f.append(item);
        }
    }
    f.onclick = (e) => {
        if (e.target === f) return;
        const EL = e.target as HTMLElement;
        title.innerText = EL.title;
    };
    div.append(title, f);
    return div;
}

//###### setting
const settingEl = document.getElementById("setting");
document.getElementById("settingb").onclick = () => {
    settingEl.togglePopover();
};

const readerSettingPath = { apostrophe: "reader.apostrophe" };

settingEl.append(
    el(
        "div",
        el("h2", "阅读器"),
        el("label", el("input", { type: "checkbox", "data-path": readerSettingPath.apostrophe }), "把’转为'")
    )
);

const rmbwJsonName = "rmbw.json";
const rmbwZipName = "rmbw.zip";

type allData = {
    bookshelf: Object;
    cards: Object;
    card2chapter: Object;
    actions: Object;
};

let allData2Store: { [key in keyof allData]: LocalForage } = {
    bookshelf: bookshelfStore,
    cards: cardsStore,
    card2chapter: card2chapter,
    actions: cardActionsStore,
};
async function getAllData() {
    let l: allData = {
        bookshelf: {},
        cards: {},
        card2chapter: {},
        actions: {},
    };
    for (const storeName in allData2Store) {
        await allData2Store[storeName].iterate((v, k) => {
            l[storeName][k] = v;
        });
    }
    return JSON.stringify(l, null, 2);
}

let isSetData = false;

async function setAllData(data: string) {
    if (isSetData) return;
    isSetData = true;
    const tip = el("span", "正在更新……");
    putToast(tip, 0);
    let json = JSON.parse(data) as allData;

    if (Object.keys(json.actions).at(-1) < (await cardActionsStore.keys()).at(-1)) {
        const r = await confirm(`⚠️本地数据似乎更加新，是否继续更新？\n若更新，可能造成数据丢失`);
        if (!r) {
            tip.remove();
            isSetData = false;
            return;
        }
    }

    for (let key of ["cards", "spell"]) {
        for (let i in json[key]) {
            let r = json[key][i] as Card;
            r.due = new Date(r.due);
            r.last_review = new Date(r.last_review);
        }
    }
    const wrongL: { [name: string]: { n: number; o: number } } = {};
    for (const storeName in allData2Store) {
        const oldLength = await allData2Store[storeName].length();
        const newLength = Object.keys(json[storeName]).length;
        if (oldLength > 10 && newLength < 0.5 * oldLength) {
            wrongL[storeName] = { n: newLength, o: oldLength };
        }
    }
    if (Object.keys(wrongL).length) {
        let l: string[] = [];
        for (let i in wrongL) {
            l.push(`${i}：${wrongL[i].o}->${wrongL[i].n}`);
        }
        const r = await confirm(
            `⚠️以下数据内容发生重大变更，是否继续更新？\n若更新，可能造成数据丢失\n\n${l.join("\n")}`
        );
        if (!r) {
            tip.remove();
            isSetData = false;
            return;
        }
    }
    for (const storeName in allData2Store) {
        await allData2Store[storeName].clear();
        await allData2Store[storeName].setItems(json[storeName]);
    }
    requestIdleCallback(() => {
        location.reload();
    });
}

async function xunzip(file: Blob) {
    const zipFileReader = new zip.BlobReader(file);
    const strWriter = new zip.TextWriter();
    const zipReader = new zip.ZipReader(zipFileReader);
    const firstEntry = (await zipReader.getEntries()).shift();
    const str = await firstEntry.getData(strWriter);
    await zipReader.close();
    return str;
}

function xzip(data: string) {
    let fs = new zip.fs.FS();
    fs.addText(rmbwJsonName, data);
    return fs.exportBlob();
}

function basicAuth(username: string, passwd: string) {
    return `Basic ${username}:${passwd}`;
}

function joinFilePath(baseurl: string, name: string) {
    let url = baseurl;
    if (url.at(-1) != "/") url += "/";
    url += rmbwZipName;
    return url;
}

const DAVConfigPath = { url: "webStore.dav.url", user: "webStore.dav.user", passwd: "webStore.dav.passwd" };

async function getDAV() {
    const baseurl = (await setting.getItem(DAVConfigPath.url)) as string;
    const username = (await setting.getItem(DAVConfigPath.user)) as string;
    const passwd = (await setting.getItem(DAVConfigPath.passwd)) as string;
    let url = joinFilePath(baseurl, rmbwZipName);
    let data = (
        await fetch(url, {
            method: "get",
            headers: { Authorization: basicAuth(username, passwd) },
        })
    ).blob();
    return data;
}

async function setDAV(data: Blob) {
    const baseurl = (await setting.getItem(DAVConfigPath.url)) as string;
    const username = (await setting.getItem(DAVConfigPath.user)) as string;
    const passwd = (await setting.getItem(DAVConfigPath.passwd)) as string;
    let url = joinFilePath(baseurl, rmbwZipName);
    fetch(url, {
        method: "put",
        headers: { Authorization: basicAuth(username, passwd) },
        body: data,
    })
        .then(() => {
            const p = el("span", "上传成功");
            putToast(p);
        })
        .catch(() => {
            putToast(el("span", "上传失败"), 6000);
        });
}

const GitHubConfigPath = {
    user: "webStore.github.user",
    repo: "webStore.github.repo",
    token: "webStore.github.token",
    path: "webStore.github.path",
    download: "webStore.github.download",
};

async function getGitHub() {
    const user = (await setting.getItem(GitHubConfigPath.user)) as string;
    const repo = (await setting.getItem(GitHubConfigPath.repo)) as string;
    const token = (await setting.getItem(GitHubConfigPath.token)) as string;
    const path = ((await setting.getItem(GitHubConfigPath.path)) as string) || "data.json";
    return {
        url: `https://api.github.com/repos/${user}/${repo}/contents/${path}`,
        auth: {
            Authorization: `Bearer ${token}`,
        },
        user,
        repo,
        path,
    };
}

let uploadDataEl = el("input", "上传数据", {
    type: "file",
    onchange: () => {
        let reader = new FileReader();
        reader.readAsText(uploadDataEl.files[0]);
        reader.onload = () => {
            setAllData(reader.result as string);
        };
    },
});

import { encode } from "js-base64";
import { PDFPageProxy } from "pdfjs-dist";

function download(text: string, name: string) {
    let blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

let asyncEl = el("div", [
    el("h2", "数据"),
    el("div", [
        el("button", "导出数据", {
            onclick: async () => {
                let data = await getAllData();
                download(data, rmbwJsonName);
            },
        }),
        uploadDataEl,
    ]),
    el("div", [
        el("h3", "webDAV"),
        el("button", "↓", {
            onclick: async () => {
                let data = await getDAV();
                let str = await xunzip(data);
                setAllData(JSON.parse(str));
            },
        }),
        el("button", "↑", {
            onclick: async () => {
                let data = await getAllData();
                let file = await xzip(data);
                setDAV(file);
            },
        }),
        el("form", [
            el("label", ["url：", el("input", { "data-path": DAVConfigPath.url })]),
            el("label", ["用户名：", el("input", { "data-path": DAVConfigPath.user })]),
            el("label", ["密码：", el("input", { "data-path": DAVConfigPath.passwd })]),
        ]),
        el("h3", "GitHub"),
        el("button", "↓", {
            onclick: async () => {
                let config = await getGitHub();
                let data = await fetch(
                    (await setting.getItem(GitHubConfigPath.download)) ||
                        `https://raw.githubusercontent.com/${config.user}/${config.repo}/main/${config.path}`
                );
                let str = await data.text();
                setAllData(str);
            },
        }),
        el("button", "↑", {
            onclick: async () => {
                let data = await getAllData();
                let base64 = encode(data);
                let config = await getGitHub();
                let sha = "";
                try {
                    sha = (await (await fetch(config.url, { headers: { ...config.auth } })).json()).sha;
                } catch (error) {}
                fetch(config.url, {
                    method: "PUT",
                    headers: {
                        ...config.auth,
                    },
                    body: JSON.stringify({
                        message: "更新数据",
                        content: base64,
                        sha,
                    }),
                })
                    .then(() => {
                        const p = el("span", "上传成功");
                        putToast(p);
                    })
                    .catch(() => {
                        putToast(el("span", "上传失败"), 6000);
                    });
            },
        }),
        el("form", [
            el("label", ["用户：", el("input", { "data-path": GitHubConfigPath.user })]),
            el("label", ["仓库（repo）：", el("input", { "data-path": GitHubConfigPath.repo })]),
            el("label", [
                "token：",
                el("input", { "data-path": GitHubConfigPath.token }),
                el("a", { href: "https://github.com/settings/tokens/new?description=rmbw2&scopes=repo" }, "创建"),
            ]),
            el("label", ["path：", el("input", { "data-path": GitHubConfigPath.path })]),
            el("label", ["替换下载：", el("input", { "data-path": GitHubConfigPath.download })]),
        ]),
    ]),
]);

settingEl.append(asyncEl);

async function getCSV() {
    const spChar = ",";
    let text: string[] = [["card_id", "review_time", "review_rating", "review_state", "review_duration"].join(spChar)];
    await cardActionsStore.iterate((v, k) => {
        if (!v["rating"]) return;
        const card_id = v["cardId"];
        const review_time = Number(k);
        const review_rating = v["rating"];
        const review_state = v["state"];
        const review_duration = v["duration"];
        let row = [card_id, review_time, review_rating, review_state, review_duration].join(spChar);
        text.push(row);
    });
    const csv = text.join("\n");
    return csv;
}

const testSpeedLanEl = el("input");
const testSpeedContentEl = el("p");
const readSpeedEl = el("input", { type: "number", "data-path": "user.readSpeed" });

settingEl.append(
    el("div", [
        el("h2", "复习"),
        el("button", "导出", {
            onclick: async () => {
                const csv = await getCSV();
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "review.csv";
                a.click();
            },
        }),
        el("br"),
        el("label", ["参数：", el("input", { "data-path": "fsrs.w" })]),

        el("h3", "复习休息"),
        el("input", { type: "number", path: "review.maxCount", value: String(maxReviewCount) }),
        el("span", "0为不限制，刷新生效"),
    ])
);

settingEl.append(
    el("div", { class: "about" }, [
        el("h2", "关于"),
        el("div", [
            el("div", [el("img", { width: "32", src: "./logo/logo.svg" }), "rmbw2"]),
            el(
                "a",
                el("img", {
                    src: "https://www.netlify.com/v3/img/components/netlify-light.svg",
                    alt: "Deploys by Netlify",
                    loading: "lazy",
                })
            ),
            el("div", [
                el("button", "更新", {
                    onclick: async () => {
                        const cacheKeepList = ["v2"];
                        const keyList = await caches.keys();
                        const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
                        await Promise.all(
                            cachesToDelete.map(async (key) => {
                                await caches.delete(key);
                            })
                        );
                    },
                }),
            ]),
            el("div", [
                el(
                    "a",
                    { href: "https://github.com/xushengfeng/xlinkote/", target: "_blank" },
                    "项目开源地址",
                    el("img", { src: githubIcon })
                ),
            ]),
            el("div", el("a", { href: "https://github.com/xushengfeng/xlinkote/blob/master/LICENSE" }, "GPL-3.0")),
            el("div", [
                "Designed and programmed by xsf ",
                el("a", { href: "mailto:xushengfeng_zg@163.com" }, "xushengfeng_zg@163.com"),
            ]),
        ]),
    ])
);

settingEl.querySelectorAll("[data-path]").forEach(async (el: HTMLElement) => {
    const path = el.getAttribute("data-path");
    let value = await setting.getItem(path);
    if (el.tagName === "INPUT") {
        let iel = el as HTMLInputElement;
        if (iel.type === "checkbox") {
            iel.checked = value as boolean;
            iel.addEventListener("input", () => {
                setting.setItem(path, iel.checked);
            });
        } else if (iel.type === "range") {
            iel.value = value as string;
            iel.addEventListener("input", () => {
                setting.setItem(path, Number(iel.value));
            });
        } else {
            iel.value = value as string;
            iel.addEventListener("input", () => {
                setting.setItem(path, iel.value);
            });
        }
    } else if (el.tagName === "SELECT") {
        (el as HTMLSelectElement).value = value as string;
        el.onchange = () => {
            setting.setItem(path, (el as HTMLSelectElement).value);
        };
    }
});

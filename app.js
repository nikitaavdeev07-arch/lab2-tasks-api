const express = require("express");
const app = express();
const port = 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для логирования
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ============ ХРАНИЛИЩЕ ДАННЫХ ============
// Поля: id, title, done (базовые) + priority, deadline (доп. для среднего уровня)
let tasks = [
  {
    id: 1,
    title: "Сделать лабораторную работу",
    done: false,
    priority: "high",
    deadline: "2023-12-01",
  },
  {
    id: 2,
    title: "Купить продукты",
    done: true,
    priority: "medium",
    deadline: "2023-12-05",
  },
  {
    id: 3,
    title: "Прочитать книгу",
    done: false,
    priority: "low",
    deadline: "2023-12-10",
  },
];

let nextId = 4;

// ============ CRUD ОПЕРАЦИИ ============

// GET /items - получение списка с поиском, сортировкой и пагинацией
app.get("/items", (req, res) => {
  let result = [...tasks]; // Копируем массив, чтобы не менять оригинал

  // 1. Поиск по названию (search)
  const search = req.query.search;
  if (search) {
    result = result.filter((task) =>
      task.title.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // 2. Сортировка (sort & order)
  const sortField = req.query.sort;
  const order = req.query.order === "desc" ? -1 : 1; // По умолчанию asc

  if (sortField) {
    result.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * order;
      if (a[sortField] > b[sortField]) return 1 * order;
      return 0;
    });
  }

  // 3. Пагинация (page & limit)
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || result.length; // Если limit не указан - отдаем все
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedResult = result.slice(startIndex, endIndex);

  res.json({
    total: result.length,
    page: page,
    limit: limit,
    items: paginatedResult,
  });
});

// GET /items/:id - получение одной задачи
app.get("/items/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: "Задача не найдена" });
  }
  res.json(task);
});

// POST /items - создание новой задачи
app.post("/items", (req, res) => {
  const { title, done, priority, deadline } = req.body;

  // ВАЛИДАЦИЯ: Обязательное поле title
  if (!title || typeof title !== "string") {
    return res
      .status(400)
      .json({ error: "Поле title обязательно и должно быть строкой" });
  }

  // ВАЛИДАЦИЯ: Проверка типов и допустимых значений
  if (done !== undefined && typeof done !== "boolean") {
    return res
      .status(400)
      .json({ error: "Поле done должно быть булевым значением (true/false)" });
  }

  const allowedPriorities = ["low", "medium", "high"];
  if (priority && !allowedPriorities.includes(priority)) {
    return res
      .status(400)
      .json({ error: "Приоритет должен быть: low, medium или high" });
  }

  const newTask = {
    id: nextId++,
    title: title,
    done: done !== undefined ? done : false, // По умолчанию false
    priority: priority || "medium", // По умолчанию medium
    deadline: deadline || null,
  };

  tasks.push(newTask);
  res.status(201).json(newTask); // 201 Created
});

// PUT /items/:id - полное обновление
app.put("/items/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  const { title, done, priority, deadline } = req.body;

  // Валидация для PUT (обязательно наличие title)
  if (!title) {
    return res
      .status(400)
      .json({ error: "Поле title обязательно для полного обновления" });
  }

  tasks[index] = {
    id: id,
    title: title,
    done: done !== undefined ? done : tasks[index].done,
    priority: priority || tasks[index].priority,
    deadline: deadline || tasks[index].deadline,
  };

  res.json(tasks[index]);
});

// DELETE /items/:id - удаление задачи
app.delete("/items/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Задача не найдена" });
  }

  tasks.splice(index, 1);
  // Требование среднего уровня: 204 No Content при DELETE
  res.status(204).send();
});

// ============ ОБРАБОТКА 404 ============
app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

// ============ ЗАПУСК СЕРВЕРА ============
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});

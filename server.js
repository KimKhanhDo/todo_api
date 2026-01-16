import { createServer } from 'http';

const ALLOWED_ORIGIN = process.env.CLIENT_URL || '*';

// DB in memory
let taskID = 4;
const db = {
    tasks: [
        { id: 1, title: 'Learn Node JS', isCompleted: false },
        { id: 2, title: 'Build REST API', isCompleted: true },
        { id: 3, title: 'Build FE', isCompleted: false },
    ],
};

function serverResponse(httpRes, response) {
    httpRes.writeHead(response.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods':
            'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    httpRes.end(JSON.stringify(response));
}

// req: tiếp nhận yêu cầu
// res: xử lý phản hồi
const server = createServer((req, res) => {
    // Khởi tạo response với status mặc định
    let response = {
        status: 200,
    };

    // [GET] /api/tasks
    if (req.method === 'GET' && req.url === '/api/tasks') {
        response.data = db.tasks;

        serverResponse(res, response);
        return;
    }

    // [GET] /api/tasks/:id
    if (req.method === 'GET' && req.url.startsWith('/api/tasks')) {
        const id = +req.url.split('/').pop();
        const task = db.tasks.find((_task) => _task.id === id);

        if (task) {
            response.data = task;
        } else {
            response.status = 404;
            response.message = 'Resource not found';
        }

        serverResponse(res, response);
        return;
    }

    // [POST] /api/tasks
    if (req.method === 'POST' && req.url === '/api/tasks') {
        let body = '';
        req.on('data', (buffer) => {
            body += buffer.toString();
        });

        req.on('end', () => {
            const payload = JSON.parse(body);
            const newTask = {
                id: taskID++,
                title: payload.title,
                isCompleted: false,
            };

            db.tasks.push(newTask);

            response.status = 201;
            response.data = newTask;

            serverResponse(res, response);
        });

        return;
    }

    // [PUT/PATCH] /api/tasks/:id
    if (
        (req.method === 'PUT' || req.method === 'PATCH') &&
        req.url.startsWith('/api/tasks/')
    ) {
        const id = +req.url.split('/').pop();
        const taskIndex = db.tasks.findIndex((_task) => _task.id === id);

        if (taskIndex !== -1) {
            let body = '';
            req.on('data', (buffer) => {
                body += buffer.toString();
            });

            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);

                    // Cập nhật task trong array
                    if (req.method === 'PUT') {
                        // PUT: thay thế toàn bộ
                        db.tasks[taskIndex] = {
                            id,
                            title: payload.title,
                            isCompleted: payload.isCompleted ?? false,
                        };
                    } else {
                        // PATCH: chỉ cập nhật những field được gửi lên
                        if (payload.title !== undefined) {
                            db.tasks[taskIndex].title = payload.title;
                        }

                        if (payload.isCompleted !== undefined) {
                            db.tasks[taskIndex].isCompleted =
                                payload.isCompleted;
                        }
                    }

                    response.status = 200;
                    response.data = db.tasks[taskIndex];

                    serverResponse(res, response);
                } catch (error) {
                    // Xử lý lỗi JSON parse
                    response.status = 400;
                    response.message = 'Invalid JSON';
                    serverResponse(res, response);
                }
            });

            return;
        }

        response.status = 404;
        response.message = 'Resource not found';
        serverResponse(res, response);
        return;
    }

    // [DELETE] /api/tasks/:id
    if (req.method === 'DELETE' && req.url.startsWith('/api/tasks/')) {
        const id = +req.url.split('/').pop();
        const taskIndex = db.tasks.findIndex((_task) => _task.id === id);

        if (taskIndex !== -1) {
            // Lưu task trước khi xóa để trả về nếu dùng code 200
            const deletedTask = db.tasks[taskIndex];

            // Xóa task
            db.tasks.splice(taskIndex, 1);

            // Code 204 không trả về data
            // response.status = 204;

            // Code 200 trả về data
            response.status = 200;
            response.data = deletedTask;
            response.message = 'Task deleted successfully';

            serverResponse(res, response);
        } else {
            // Task không tồn tại
            response.status = 404;
            response.message = 'Resource not found';
            serverResponse(res, response);
        }

        return;
    }

    //  Other
    serverResponse(res, {
        status: 200,
        data: 'OK',
    });
});

const port = process.env.PORT || 3000;

// starts a simple http server locally on port 3000
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

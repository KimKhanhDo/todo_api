import { createServer } from 'http';

const ALLOWED_ORIGIN = process.env.CLIENT_URL || '*';

// In memory DB
let taskID = 4;
const db = {
    tasks: [
        { id: 1, title: 'Learn Node JS', isCompleted: false },
        { id: 2, title: 'Build REST API', isCompleted: true },
        { id: 3, title: 'Build FE', isCompleted: false },
    ],
};

// Actual Request (POST/GET/PUT/DELETE) - Request thực sự mang data đi qua serverResponse
// Return data + status code - Được gọi bởi các route handlers
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
    // XỬ LÝ OPTIONS REQUEST (Preflight request) -> Không gọi serverResponse()
    // Return 204 (no content) ngay
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods':
                'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

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
        ['PUT', 'PATCH'].includes(req.method) &&
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

    // [BYPASS CORS] /bypass-cors?url=...
    if (req.url.startsWith('/bypass-cors')) {
        // Parse query params
        const fullUrl = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = fullUrl.searchParams.get('url');

        if (!targetUrl) {
            serverResponse(res, {
                status: 400,
                message: 'Missing "url" query parameter',
            });
            return;
        }

        // Đọc body (nếu có)
        let body = '';
        req.on('data', (buffer) => {
            body += buffer.toString();
        });

        // Xử lý khi nhận đủ body
        req.on('end', async () => {
            try {
                // Tạo fetch options
                const fetchOptions = {
                    method: req.method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };

                // Thêm body nếu không phải GET/HEAD
                if (!['GET', 'HEAD'].includes(req.method) && body) {
                    fetchOptions.body = body;
                }

                // Gọi target URL
                const apiResponse = await fetch(targetUrl, fetchOptions);
                const data = await apiResponse.json();

                // Trả về data
                serverResponse(res, {
                    status: apiResponse.status,
                    data: data,
                });
            } catch (error) {
                serverResponse(res, {
                    status: 500,
                    message: 'Failed to fetch from target URL',
                    error: error.message,
                });
            }
        });
        return;
    }

    // Default route
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

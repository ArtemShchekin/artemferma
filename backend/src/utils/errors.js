export class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.status = status;
    this.expose = options.expose !== undefined ? options.expose : status < 500;
    this.details = options.details;
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Ошибка валидации') {
    super(400, message);
  }
}

export class RequiredFieldError extends HttpError {
  constructor(message = 'Не заполнено поле') {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'unauthorized') {
    super(401, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Не найдено') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Конфликт') {
    super(409, message);
  }
}

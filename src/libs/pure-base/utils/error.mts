export enum ErrorTypeId {
  AbortError = "io.gitgud/ioV9x/mytfgames#AbortError",
  AggregateError = "io.gitgud/ioV9x/mytfgames#AggregateError",
  ErrnoException = "io.gitgud/ioV9x/mytfgames#ErrnoException",
  ExternalApiError = "io.gitgud/ioV9x/mytfgames#ExternalApiError",
  LogicError = "io.gitgud/ioV9x/mytfgames#LogicError",
  TransferredError = "io.gitgud/ioV9x/mytfgames#TransferredError",
  TransportClosedError = "io.gitgud/ioV9x/mytfgames#TransportClosedError",
}

const ExtendedErrorType = Symbol.for(
  "io.gitgud/ioV9x/mytfgames#ExtendedErrorType",
);
interface ExtendedError extends Error {
  readonly [ExtendedErrorType]: true;
}
function isExtendedError(error: unknown): error is ExtendedError {
  return (
    typeof error === "object" &&
    error !== null &&
    ExtendedErrorType in error &&
    error[ExtendedErrorType] === true
  );
}
interface BasicSerializedError {
  type: ErrorTypeId;
  name: string;
  message: string;
  cause: unknown;
}
interface SerializedExternalApiError extends BasicSerializedError {
  type: ErrorTypeId.ExternalApiError;
}

////////////////////////////////////////////////////////////////////////////////
// AggregateError
const AggregateErrorType = Symbol.for(ErrorTypeId.AggregateError);
interface AggregateErrorEx extends AggregateError, ExtendedError {
  readonly [AggregateErrorType]: true;

  errors: unknown[];
  /**
   * @deprecated Use `errors` instead
   */
  cause: unknown[];
}
interface SerializedAggregateError extends BasicSerializedError {
  type: ErrorTypeId.AggregateError;
  errors: unknown[];
}
export type { AggregateErrorEx as AggregateError };
class $AggregateError extends AggregateError implements AggregateErrorEx {
  get [ExtendedErrorType]() {
    return true as const;
  }
  get [AggregateErrorType]() {
    return true as const;
  }
  override get cause(): unknown[] {
    return this.errors as unknown[];
  }
}
export function makeAggregateError(
  errors: unknown[],
  message?: string,
): AggregateErrorEx {
  return new $AggregateError(errors, message);
}
export function isAggregateError(error: unknown): error is AggregateErrorEx {
  return (
    isExtendedError(error) &&
    AggregateErrorType in error &&
    error[AggregateErrorType] === true
  );
}

////////////////////////////////////////////////////////////////////////////////
// AbortError
const AbortErrorType = Symbol.for(ErrorTypeId.AbortError);
interface AbortErrorEx extends ExtendedError {
  readonly [AbortErrorType]: true;
}
export type { AbortErrorEx as AbortError };
class $AbortError extends Error implements AbortErrorEx {
  get [ExtendedErrorType]() {
    return true as const;
  }
  get [AbortErrorType]() {
    return true as const;
  }
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    super.name = "AbortError";
  }
}
export interface SerializedAbortError extends BasicSerializedError {
  type: ErrorTypeId.AbortError;
}
export function makeAbortError(
  message?: string,
  options?: ErrorOptions,
): AbortErrorEx {
  return new $AbortError(message, options);
}
export function isAbortError(error: unknown): error is AbortErrorEx {
  return (
    isExtendedError(error) &&
    AbortErrorType in error &&
    error[AbortErrorType] === true
  );
}

////////////////////////////////////////////////////////////////////////////////
// Errno Exception
interface ErrnoException extends Error {
  code: string;
  errno: number;
  path?: string | undefined;
  syscall?: string | undefined;
}
interface SerializedErrnoException extends BasicSerializedError {
  type: ErrorTypeId.ErrnoException;
  code: string;
  errno: number;
  path?: string | undefined;
  syscall?: string | undefined;
}
export function isErrnoException(error: unknown): error is ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    "errno" in error &&
    typeof error.errno === "number"
  );
}

////////////////////////////////////////////////////////////////////////////////
// Logic Error
const LogicErrorType = Symbol.for(ErrorTypeId.LogicError);
export interface LogicError extends ExtendedError {
  readonly [LogicErrorType]: true;
}
class $LogicError extends Error implements LogicError {
  get [ExtendedErrorType]() {
    return true as const;
  }
  get [LogicErrorType]() {
    return true as const;
  }
}
interface SerializedLogicError extends BasicSerializedError {
  type: ErrorTypeId.LogicError;
}
export function makeLogicError(
  message?: string,
  options?: ErrorOptions,
): LogicError {
  return new $LogicError(message, options);
}
export function isLogicError(error: unknown): error is LogicError {
  return (
    isExtendedError(error) &&
    LogicErrorType in error &&
    error[LogicErrorType] === true
  );
}

////////////////////////////////////////////////////////////////////////////////
// Transferred Error
const TransferredErrorType = Symbol.for(ErrorTypeId.TransferredError);
export interface TransferredError extends ExtendedError {
  readonly [TransferredErrorType]: true;

  cause: SerializedError;
}
class $TransferredError extends Error implements TransferredError {
  get [ExtendedErrorType]() {
    return true as const;
  }
  get [TransferredErrorType]() {
    return true as const;
  }

  constructor(override readonly cause: SerializedError) {
    super(cause.message, { cause: cause });
  }
}
export function isTransferredError(error: unknown): error is TransferredError {
  return (
    isExtendedError(error) &&
    TransferredErrorType in error &&
    error[TransferredErrorType] === true
  );
}
export function makeTransferredError(cause: SerializedError): TransferredError {
  return new $TransferredError(cause);
}

////////////////////////////////////////////////////////////////////////////////
// Transport Closed Error
const TransportClosedErrorType = Symbol.for(ErrorTypeId.TransportClosedError);
export interface TransportClosedError extends Error {
  readonly [TransportClosedErrorType]: true;
}
class $TransportClosedError extends Error implements TransportClosedError {
  get [TransportClosedErrorType]() {
    return true as const;
  }
}
interface SerializedTransportClosedError extends BasicSerializedError {
  type: ErrorTypeId.TransportClosedError;
}
export function isTransportClosedError(
  error: unknown,
): error is TransportClosedError {
  return (
    error instanceof Error &&
    TransportClosedErrorType in error &&
    error[TransportClosedErrorType] === true
  );
}
export function makeTransportClosedError(transport: {
  id: string;
}): TransportClosedError {
  return new $TransportClosedError(
    `Remote service has not been served before "${transport.id}" closed`,
  );
}

////////////////////////////////////////////////////////////////////////////////

export type SerializedError =
  | SerializedAbortError
  | SerializedAggregateError
  | SerializedErrnoException
  | SerializedExternalApiError
  | SerializedLogicError
  | SerializedTransportClosedError;

export function serializeError(error: ExtendedError): SerializedError {
  if (isTransferredError(error)) {
    return error.cause;
  } else if (isAbortError(error)) {
    return {
      type: ErrorTypeId.AbortError,
      name: error.name,
      message: error.message,
      cause: error.cause,
    };
  } else if (isAggregateError(error)) {
    return {
      type: ErrorTypeId.AggregateError,
      name: error.name,
      message: error.message,
      errors: error.errors.map((nested): unknown =>
        isExtendedError(nested) ? serializeError(nested) : nested,
      ),
      cause: undefined,
    };
  } else if (isErrnoException(error)) {
    return {
      type: ErrorTypeId.ErrnoException,
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      cause: error.cause,
    };
  } else if (isLogicError(error)) {
    return {
      type: ErrorTypeId.LogicError,
      name: error.name,
      message: error.message,
      cause: error.cause,
    };
  } else if (isTransportClosedError(error)) {
    return {
      type: ErrorTypeId.TransportClosedError,
      name: error.name,
      message: error.message,
      cause: error.cause,
    };
  } else if (error instanceof Error) {
    return {
      type: ErrorTypeId.ExternalApiError,
      name: error.name,
      message: error.message,
      cause: error.cause,
    };
  }
  throw new Error("Unknown error type");
}

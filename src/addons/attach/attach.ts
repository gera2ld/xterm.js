/**
 * Copyright (c) 2014 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Implements the attach method, that attaches the terminal to a WebSocket stream.
 */

/**
 * Attaches the given terminal to the given socket.
 *
 * @param {Terminal} term - The terminal to be attached to the given socket.
 * @param {WebSocket} socket - The socket to attach the current terminal.
 * @param {boolean} bidirectional - Whether the terminal should send data
 *                                  to the socket as well.
 * @param {boolean} buffered - Whether the rendering of incoming data
 *                             should happen instantly or at a maximum
 *                             frequency of 1 rendering per 10ms.
 */
export function attach(term: any, socket: WebSocket, bidirectional: boolean, buffered: boolean): void {
  bidirectional = (typeof bidirectional === 'undefined') ? true : bidirectional;
  term.socket = socket;

  term._flushBuffer = () => {
    term.write(term._attachSocketBuffer);
    term._attachSocketBuffer = null;
  };

  term._pushToBuffer = (data: string) => {
    if (term._attachSocketBuffer) {
      term._attachSocketBuffer += data;
    } else {
      term._attachSocketBuffer = data;
      setTimeout(term._flushBuffer, 10);
    }
  };

  let myTextDecoder;

  term._getMessage = function(ev: MessageEvent): void {
    let str;
    if (typeof ev.data === 'object') {
      if (ev.data instanceof ArrayBuffer) {
          if (!myTextDecoder) {
            myTextDecoder = new TextDecoder();
          }

          str = myTextDecoder.decode( ev.data );
      } else {
        throw 'TODO: handle Blob?';
      }
    }

    if (buffered) {
      term._pushToBuffer(str || ev.data);
    } else {
      term.write(str || ev.data);
    }
  };

  term._sendData = (data: string) => {
    if (socket.readyState !== 1) {
      return;
    }
    socket.send(data);
  };

  socket.addEventListener('message', term._getMessage);

  if (bidirectional) {
    term.on('data', term._sendData);
  }

  socket.addEventListener('close', term.detach.bind(term, socket));
  socket.addEventListener('error', term.detach.bind(term, socket));
};

/**
 * Detaches the given terminal from the given socket
 *
 * @param {Terminal} term - The terminal to be detached from the given socket.
 * @param {WebSocket} socket - The socket from which to detach the current
 *                             terminal.
 */
export function detach(term: any, socket: WebSocket): void {
  term.off('data', term._sendData);

  socket = (typeof socket === 'undefined') ? term.socket : socket;

  if (socket) {
    socket.removeEventListener('message', term._getMessage);
  }

  delete term.socket;
};


export function apply(terminalConstructor: any): void {
  /**
   * Attaches the current terminal to the given socket
   *
   * @param {WebSocket} socket - The socket to attach the current terminal.
   * @param {boolean} bidirectional - Whether the terminal should send data
   *                                  to the socket as well.
   * @param {boolean} buffered - Whether the rendering of incoming data
   *                             should happen instantly or at a maximum
   *                             frequency of 1 rendering per 10ms.
   */
  terminalConstructor.prototype.attach = (socket: WebSocket, bidirectional: boolean, buffered: boolean) => {
    return attach(this, socket, bidirectional, buffered);
  };

  /**
   * Detaches the current terminal from the given socket.
   *
   * @param {WebSocket} socket - The socket from which to detach the current
   *                             terminal.
   */
  terminalConstructor.prototype.detach = (socket: WebSocket) => {
    return detach(this, socket);
  };
};

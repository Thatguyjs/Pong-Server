// Read / Write WebSocket frames


class Frame {
	static CONTINUATION = 0;
	static TEXT = 1;
	static BINARY = 2;
	// 3-7 Reserved (non-control)
	static CLOSE = 8;
	static PING = 9;
	static PONG = 10;
	// 11-15 Reserved (control)

	fin = true;
	rsv = [0, 0, 0];
	opcode = -1;
	mask = false;
	length = 0;
	mask_key = null; // Buffer
	data = null; // String or Buffer

	constructor(options={}) {
		this.fin = options.fin ?? true;
		this.rsv = options.rsv ?? [0, 0, 0];
		this.opcode = options.opcode ?? -1;
		this.mask = options.mask ?? false;
		this.length = options.length ?? null;
		this.mask_key = options.mask_key ?? null;
		this.data = options.data ?? null;
	}


	to_buffer() {
		if(this.data === null) this.data = Buffer.alloc(0);
		let data_buf = Buffer.isBuffer(this.data) ? this.data : Buffer.from(this.data);
		let data_length = data_buf.length;

		let length = data_length + 2;
		if(data_length > 125) length += 2;
		if(data_length > 65535) length += 6;

		let frame_buf = Buffer.alloc(length);
		let byte_offset = 2;

		frame_buf.writeUInt8(
			(this.fin << 7) |
			(this.rsv[0] << 6) |
			(this.rsv[1] << 5) |
			(this.rsv[2] << 4) |
			this.opcode,
			0
		);

		if(data_length <= 125) {
			frame_buf.writeUInt8((this.mask << 7) | data_length, 1);
		}
		else if(data_length <= 65535) {
			frame_buf.writeUInt8((this.mask << 7) | 126, 1);
			frame_buf.writeUInt16BE(data_length, 2);
			byte_offset += 2;
		}
		else {
			frame_buf.writeUInt8((this.mask << 7) | 127, 1);
			frame_buf.writeUInt32BE(data_length >>> 16 >>> 16, 2);
			frame_buf.writeUInt32BE(data_length & 0xffffffff, 6);
			byte_offset += 8;
		}

		data_buf.copy(frame_buf, byte_offset);
		return frame_buf;
	}


	static write(opcode, data) {
		const frame = new Frame({ opcode, data });
		return frame.to_buffer();
	}


	static read(buffer) {
		let first_byte = buffer.readUInt8(0);
		let second_byte = buffer.readUInt8(1);

		let length = second_byte & 127;
		let byte_offset = 2;

		if(length === 126) {
			length = buffer.readUInt16BE(2);
			byte_offset += 2;
		}
		else if(length === 127) {
			length = (buffer.readUInt32BE(2) << 16 << 16) | buffer.readUInt32BE(6);
			byte_offset += 8;
		}

		if(length > Number.MAX_SAFE_INTEGER) return null;

		const mask = (second_byte >>> 7) ? true : false;
		let mask_key = null;

		let data = null;

		if(!mask) {
			data = buffer.slice(byte_offset, byte_offset + length);
		}
		else {
			mask_key = buffer.slice(byte_offset, byte_offset + 4);
			byte_offset += 4;
			data = Buffer.alloc(length);

			for(let i = 0; i < length; i++) {
				data.writeUInt8(buffer.readUInt8(byte_offset + i) ^ mask_key.readUInt8(i % 4), i);
			}
		}

		const opcode = first_byte & 0xf;

		return new Frame({
			fin: (first_byte >>> 7) ? true : false,
			rsv: [(first_byte >>> 6) & 1, (first_byte >>> 5) & 1, (first_byte >>> 4) & 1],
			opcode,
			mask,
			length,
			mask_key,
			data: opcode === Frame.TEXT ? data.toString() : data
		});
	}
}


export default Frame;

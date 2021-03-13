import dotenv from 'dotenv';
let result = dotenv.config();
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (result.error && process.env.NODE_ENV === 'development') {
	throw result.error;
}

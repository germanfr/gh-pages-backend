import dotenv from 'dotenv';
let result = dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CLIENT_DOMAIN = process.env.CLIENT_DOMAIN || 'http://localhost:4000';

if (result.error && process.env.NODE_ENV === 'development') {
	throw result.error;
}

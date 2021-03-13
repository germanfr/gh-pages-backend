import dotenv from 'dotenv';
let result = dotenv.config();
if (result.error) {
	throw result.error;
}

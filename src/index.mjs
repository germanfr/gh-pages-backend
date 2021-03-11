import express from 'express';

const PORT = parseInt(process.env.PORT) || 3000;

const app = express();



app.get('/contributions', (req, res) => {
	res.send('Hello world!');
});



app.listen(PORT, function(...args) {
	console.log(`Server running on port ${this.address().port}`);
});

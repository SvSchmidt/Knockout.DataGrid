const express = require('express');
const app = express();

app.use(express.static('./views'));
app.use('/css', express.static('./css'));
app.use('/js', express.static('./js'));

app.get('/', (req, res) => {
    res.render('index.html');
});

app.listen(8080, () => console.info('server started at localhost:8080'));

import 'dotenv/config';
import app from '../api/index';
const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log('QuickStocks API ready at http://localhost:' + port));

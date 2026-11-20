const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(express.json());
app.use(cors());

app.use("/estante", require("./routes/Estante"));
app.use("/autenticacao", require("./routes/Login"));
app.use("/favorito", require("./routes/Favorito"));
app.use("/comentario", require("./routes/Comentario"));
app.use("/curtida", require("./routes/Curtida"));
app.use("/emprestimo", require("./routes/Emprestimo"));
app.use("/livro", require("./routes/Livro"));
app.use("/resenha", require("./routes/Resenha"));
app.use("/usuario", require("./routes/Usuario"));
app.use("/arquivos", require("./routes/middlewares/Arquivos"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.use((req, res) => {
  return res.status(404).json({msg: "Rota não encontrada! Verifique o endereço informado."});
});


app.listen(3000, () => {
  console.log(`Servidor executando em http://localhost:3000`);
});
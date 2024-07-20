import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = process.env.PORT||3000;


function convertToLowercase(str) {
  return str.toLowerCase();
}
function capitalizeFirstLetter(str) {
  if (!str) return str; // Check if the string is empty or undefined
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "rishabh123",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Rishabh", color: "teal" },
  { id: 2, name: "Ishika", color: "powderblue" },
];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users"); 
  //here the user arr of the object is changed ...
  users = result.rows; 
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser(); 
  console.log(countries);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

//INSERT new country
app.post("/add", async (req, res) => {
 
  const input1 = req.body.country;
    const input2 = convertToLowercase(input1);
    const input = capitalizeFirstLetter(input2);

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE country_name = $1",
      [input.trim()]
    );

    const data = result.rows[0];
    console.log(data); 
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode,currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      const countries = await checkVisisted();
      const currentUser = await getCurrentUser();
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users :users,
        color:currentUser.color,
        error: "Country has already been added, try again.",
      });
    }
  } catch (err) {
    console.log(err);
    const countries = await checkVisisted();
    const currentUser = await getCurrentUser();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users:users,
      color:currentUser.color,
      error: "Country name does not exist, try again.",
    });
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs"); 
  } else {
    currentUserId = req.body.user; 
    res.redirect("/"); 
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});
app.get("/delete",async(req,res)=>{
  const result = await db.query(
    "select name from users where id=$1",[currentUserId]
  );
  const data = result.rows[0]; 
  console.log(data.name); 
  res.render("delete.ejs",{name :data.name}); 
})
app.post("/delete",async(req,res)=>{
  const input1 = req.body.country;
  const input2 = convertToLowercase(input1);
  const input = capitalizeFirstLetter(input2);
  try{
    const result =await db.query(
      "SELECT country_code FROM countries WHERE country_name= $1 ;",[input.trim()]
    ); 
    const data=result.rows[0]; 
    console.log(data); 
    console.log(currentUserId); 
    const countryCode=data.country_code; 
    try{
      await db.query(
        "delete from visited_countries where country_code=$1 and user_id=$2",[countryCode,currentUserId]
      ); 
      res.redirect("/"); 
    }catch(err){
      const result = await db.query(
        "select name from users where id=$1",[currentUserId]
      );
      const data = result.rows[0]; 
      res.render("delete.ejs",{
        name: data.name,
        error:"The country is not exist in your travel list",
      })
    }
  }catch(err){
    const result = await db.query(
      "select name from users where id=$1",[currentUserId]
    );
    const data = result.rows[0]; 
    res.render("delete.ejs",{
      name: data.name,
      error:"Country name does not exist, try again.",
    })
  }

}); 
app.post("/deleteall",async(req,res)=>{
  const key =req.body.key; 
  const result= await db.query("select key from security_key where id=1"); 
  const skey=result.rows[0];
 const SecurityKey=skey.key; 
  if(key==SecurityKey){
    await db.query("delete from visited_countries "); 
    res.redirect("/"); 
  }else {
    const result = await db.query(
      "select name from users where id=$1",[currentUserId]
    );
    const data = result.rows[0]; 
    res.render("delete.ejs",{
      name: data.name,
      error:"Security key is not match",
    })
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

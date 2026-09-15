from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pyodbc
import json

app = FastAPI(title="API do Simulador de Segurança")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONNECTION_STRING = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=HONCORD-6X5J2M2;"
    "Database=TreinamentoSeguranca;"
    "Trusted_Connection=yes;"
)

def get_connection():
    return pyodbc.connect(DB_CONNECTION_STRING)

@app.get("/api/scenarios/{mode}")
def get_weekly_scenarios(mode: str, limit: int = 3):
    conn = get_connection()
    cursor = conn.cursor()
    
    # No SQL Server, usamos TOP e ORDER BY NEWID() para sortear aleatoriamente
    cursor.execute("SELECT TOP (?) * FROM scenarios WHERE type = ? ORDER BY NEWID()", (limit, mode))
    
    # Mapeia as colunas do SQL para transformar as linhas em Dicionários Python
    columns = [column[0] for column in cursor.description]
    rows = cursor.fetchall()
    
    resultados = []
    for row in rows:
        scenario = dict(zip(columns, row))
        
        # Converte o BIT do SQL Server para Booleano do Python
        scenario["isPhishing"] = bool(scenario["isPhishing"])
        
        # Se for chat, o 'content' é um JSON que precisamos converter de volta para Lista
        if mode == "chat":
            scenario["messages"] = json.loads(scenario["content"])
        else:
            scenario["body"] = scenario["content"]
            
        del scenario["content"] # Remove o campo genérico antes de enviar para o Frontend
        resultados.append(scenario)
        
    conn.close()
    return resultados
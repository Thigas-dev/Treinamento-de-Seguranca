from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pyodbc
import json
from pydantic import BaseModel
from typing import Optional

class ScenarioModel(BaseModel):
    type: str
    senderName: str
    senderEmail: Optional[str] = None
    subject: str
    content: str
    isPhishing: int
    trapElementId: Optional[str] = None
    feedbackSuccess: str
    feedbackError: str
    tip: str

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
    
    cursor.execute("SELECT TOP (?) * FROM scenarios WHERE type = ? ORDER BY NEWID()", (limit, mode))
    
    columns = [column[0] for column in cursor.description]
    rows = cursor.fetchall()
    
    resultados = []
    for row in rows:
        scenario = dict(zip(columns, row))
        
        scenario["isPhishing"] = bool(scenario["isPhishing"])
        
        if mode == "chat":
            scenario["messages"] = json.loads(scenario["content"])
        else:
            scenario["body"] = scenario["content"]
            
        del scenario["content"] 
        resultados.append(scenario)
        
    conn.close()
    return resultados


@app.get("/api/admin/scenarios")
def get_all_scenarios():
    conn = get_connection() 
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scenarios ORDER BY id DESC")
    columns = [column[0] for column in cursor.description]
    scenarios = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return scenarios


@app.post("/api/admin/scenarios")
def create_scenario(scenario: ScenarioModel):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scenarios (type, senderName, senderEmail, subject, content, isPhishing, trapElementId, feedbackSuccess, feedbackError, tip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (scenario.type, scenario.senderName, scenario.senderEmail, scenario.subject, scenario.content, 
          scenario.isPhishing, scenario.trapElementId, scenario.feedbackSuccess, scenario.feedbackError, scenario.tip))
    conn.commit()
    conn.close()
    return {"message": "Cenário criado com sucesso!"}


@app.put("/api/admin/scenarios/{scenario_id}")
def update_scenario(scenario_id: int, scenario: ScenarioModel):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE scenarios 
        SET type=?, senderName=?, senderEmail=?, subject=?, content=?, isPhishing=?, trapElementId=?, feedbackSuccess=?, feedbackError=?, tip=?
        WHERE id=?
    """, (scenario.type, scenario.senderName, scenario.senderEmail, scenario.subject, scenario.content, 
          scenario.isPhishing, scenario.trapElementId, scenario.feedbackSuccess, scenario.feedbackError, scenario.tip, scenario_id))
    conn.commit()
    conn.close()
    return {"message": "Cenário atualizado com sucesso!"}


@app.delete("/api/admin/scenarios/{scenario_id}")
def delete_scenario(scenario_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scenarios WHERE id=?", (scenario_id,))
    conn.commit()
    conn.close()
    return {"message": "Cenário deletado com sucesso!"}
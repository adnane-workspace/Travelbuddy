from fastapi import FastAPI

app = FastAPI(title="TravelBuddy")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

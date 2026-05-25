const express = require('express');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion Azure Cosmos DB
const connectionString = process.env.COSMOS_CONNECTION_STRING;
let container = null;

if (connectionString) {
    const client = new CosmosClient(connectionString);
    container = client.database("feedback").container("messages");
} else {
    console.warn("Attention : COSMOS_CONNECTION_STRING n'est pas définie.");
}

// Route principale : Interface Graphique Épurée
app.get('/', async (req, res) => {
    let feedbackCards = '';

    if (container) {
        try {
            // Récupération des messages triés du plus récent au plus ancien
            const { resources: items } = await container.items.query("SELECT * from c ORDER BY c._ts DESC").fetchAll();
            
            if (items.length === 0) {
                feedbackCards = `<p style="text-align:center; color:#6b7280; font-style:italic;">Aucun feedback pour le moment. Soyez le premier !</p>`;
            } else {
                items.forEach(item => {
                    // Génération d'une icône basée sur la première lettre de l'auteur (ou 'A' par défaut)
                    const author = item.name || 'Anonyme';
                    const initial = author.charAt(0).toUpperCase();
                    
                    feedbackCards += `
                        <div class="card">
                            <div class="card-header">
                                <div class="avatar">${initial}</div>
                                <div>
                                    <h4 class="author-name">${author}</h4>
                                    <small class="card-date">ID: ${item.id}</small>
                                </div>
                            </div>
                            <p class="card-text">${item.text}</p>
                        </div>
                    `;
                });
            }
        } catch (err) {
            feedbackCards = `<p class="error-msg">⚠️ Erreur Cosmos DB : ${err.message}</p>`;
        }
    } else {
        feedbackCards = `
            <div class="error-msg">
                ⚠️ <strong>Mode déconnecté :</strong> La variable <code>COSMOS_CONNECTION_STRING</code> est manquante dans la configuration Azure.
            </div>`;
    }

    // Template HTML complet avec CSS intégré
    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feedback WebApp</title>
        <style>
            :root {
                --primary: #0e7490;
                --primary-hover: #0891b2;
                --bg: #f8fafc;
                --surface: #ffffff;
                --text: #1e293b;
                --text-light: #64748b;
                --border: #e2e8f0;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background-color: var(--bg); color: var(--text); padding: 2rem 1rem; display: flex; justify-content: center; }
            .container { width: 100%; max-width: 650px; }
            h1 { text-align: center; color: var(--primary); margin-bottom: 2rem; font-weight: 700; font-size: 2.2rem; }
            
            /* Formulaire */
            .form-box { background: var(--surface); padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border: 1px solid var(--border); margin-bottom: 2.5rem; }
            .form-box h3 { margin-bottom: 1.2rem; color: var(--text); font-size: 1.25rem; }
            .form-group { margin-bottom: 1rem; }
            label { display: block; margin-bottom: 0.4rem; font-size: 0.9rem; font-weight: 600; color: var(--text-light); }
            input[type="text"], textarea { width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 1rem; transition: border 0.2s; background: #fafafa; }
            input[type="text"]:focus, textarea/:focus { outline: none; border-color: var(--primary); background: #fff; }
            textarea { resize: vertical; min-height: 80px; }
            button { width: 100%; background: var(--primary); color: white; border: none; padding: 0.85rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
            button:hover { background: var(--primary-hover); }
            
            /* Section Feedbacks */
            .section-title { font-size: 1.4rem; margin-bottom: 1rem; color: var(--text); font-weight: 600; border-left: 4px solid var(--primary); padding-left: 10px; }
            .feedbacks-list { display: flex; flex-direction: column; gap: 1rem; }
            
            /* Cartes de Feedback */
            .card { background: var(--surface); padding: 1.25rem; border-radius: 10px; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
            .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
            .avatar { width: 40px; height: 40px; background: #e0f2fe; color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; }
            .author-name { font-size: 1rem; font-weight: 600; }
            .card-date { color: var(--text-light); font-size: 0.8rem; }
            .card-text { font-size: 0.95rem; line-height: 1.5; color: #334155; padding-left: 3.1rem; }
            
            /* Messages d'erreur */
            .error-msg { background: #fef2f2; color: #991b1b; padding: 1rem; border-radius: 8px; border: 1px solid #fca5a5; font-size: 0.9rem; margin-bottom: 1rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Feedback WebApp</h1>
            
            <div class="form-box">
                <h3>Partagez votre avis</h3>
                <form method="POST" action="/send">
                    <div class="form-group">
                        <label for="name">Votre Nom / Pseudo</label>
                        <input type="text" id="name" name="name" placeholder="Ex: Gislain T." required />
                    </div>
                    <div class="form-group">
                        <label for="message">Votre Message</label>
                        <textarea id="message" name="message" placeholder="Qu'avez-vous pensé de nos services ?" required></textarea>
                    </div>
                    <button type="submit">Envoyer le Feedback</button>
                </form>
            </div>

            <h2 class="section-title">Tous les retours</h2>
            <div class="feedbacks-list">
                ${feedbackCards}
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// Route POST : Sauvegarde de l'avis avec Nom et Message
app.post('/send', async (req, res) => {
    const { name, message } = req.body;
    
    if (container && message && name) {
        try {
            const itemToInsert = {
                id: `msg-${new Date().getTime()}`, // Format d'ID propre
                name: name,
                text: message
            };
            await container.items.create(itemToInsert);
        } catch (err) {
            console.error("Erreur lors de l'insertion dans Cosmos DB :", err);
        }
    }
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Application en ligne sur le port ${PORT}`);
});

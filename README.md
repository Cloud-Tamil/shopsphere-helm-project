# 🛍️ ShopSphere - Cloud-Native E-Commerce & Helm Platform

[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28%2B-blue?logo=kubernetes)](https://kubernetes.io/)
[![Helm](https://img.shields.io/badge/Helm-v3.12%2B-0F1689?logo=helm)](https://helm.sh/)
[![Docker](https://img.shields.io/badge/Docker-Compose_v2-2496ED?logo=docker)](https://www.docker.com/)
[![Jenkins](https://img.shields.io/badge/Jenkins-LTS_JCasC-D24939?logo=jenkins)](https://www.jenkins.io/)
[![ArgoCD](https://img.shields.io/badge/ArgoCD-GitOps-EF7B4D?logo=argo)](https://argo-cd.readthedocs.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js)](https://nodejs.org/)

ShopSphere is a production-grade cloud-native e-commerce reference application built with **Node.js Express REST API**, **Nginx SPA**, **Docker**, **Kubernetes**, **Helm v3**, **Jenkins CI/CD**, and **ArgoCD GitOps**.

---

## ⚡ Quick Start (Zero-Configuration Setup)

All microservices, container ports, database connection strings, and security secrets are pre-configured in `.env.example`.

```bash
# 1. Navigate to the project directory
cd shopsphere-helm-project

# 2. Copy the pre-configured environment template
cp .env.example .env

# 3. Spin up the entire microservices stack (Jenkins, Backend, Frontend, Postgres, Redis)
docker compose --env-file .env up -d

# 4. Check real-time service health
docker compose ps
```

---

## 🌐 Application Ports & Local Access Matrix

All services read their host port bindings dynamically from `.env`:

| Service / Container | Env Variable in `.env` | Default Port | Local Access URL | Default Credentials / Probes |
|---|---|---|---|---|
| **Jenkins Controller** | `JENKINS_PORT` | `8080` | [http://localhost:8080](http://localhost:8080) | `admin` / `admin` (Auto-configured via JCasC) |
| **Jenkins JNLP Agent** | `JENKINS_AGENT_PORT` | `50000` | `tcp://localhost:50000` | Inbound agent connection port |
| **Storefront Client** | `FRONTEND_PORT` | `8085` | [http://localhost:8085](http://localhost:8085) | Nginx SPA Storefront (Catalog, Cart, Checkout) |
| **Backend REST API** | `BACKEND_PORT` | `5000` | [http://localhost:5000](http://localhost:5000) | Express API & Kubernetes probes (`/healthz`, `/readyz`) |
| **PostgreSQL DB** | `POSTGRES_PORT` | `5432` | `localhost:5432` | `shopsphere` / `secretpass123` (DB: `shopsphere_db`) |
| **Redis Cache** | `REDIS_PORT` | `6379` | `localhost:6379` | In-memory session and catalog caching |
| **ArgoCD Dashboard** | `ARGOCD_PORT` | `8090` | [http://localhost:8090](http://localhost:8090) | GitOps Continuous Delivery UI |

> 💡 **Why is the storefront on port 8085?**  
> Jenkins natively runs on port `8080`. Mapping the Storefront to `8085` ensures both services run simultaneously on your computer with **zero port conflicts**.

---

## 🛠️ Jenkins CI/CD Controller - Setup & Access

### Why was Jenkins empty previously?
In standard Git repositories, the `Jenkinsfile` contains the **pipeline code recipe** only. It does not launch the Jenkins Controller server.  
We have provided the complete **Jenkins Controller setup** in `./jenkins/` with **Jenkins Configuration as Code (JCasC)**.

### Accessing Jenkins:
1. Open [http://localhost:8080](http://localhost:8080) in your web browser.
2. Sign in with the pre-configured credentials:
   - **Username:** `admin`
   - **Password:** `admin`
3. Click the pre-created **`shopsphere-ci-cd`** pipeline job and select **"Build Now"**.

---

## 🔄 Customizing Ports (Preventing Port Collisions)

If port `8080` or `5000` is already used by another software on your host machine, you can change any port inside `.env` without modifying code:

```dotenv
# Example: Change ports in .env
JENKINS_PORT=9090
FRONTEND_PORT=3000
BACKEND_PORT=5050
```

Apply the changes:
```bash
docker compose --env-file .env up -d
```
Jenkins will now be available at `http://localhost:9090` and Storefront at `http://localhost:3000`.

---

## 📁 Repository Structure

```
shopsphere-helm-project/
├── .env.example             # Central template with all ports, credentials, and settings
├── .env                     # Active local environment values
├── docker-compose.yml       # Multi-container stack (Jenkins, Backend, Frontend, DB, Redis)
├── Jenkinsfile              # Declarative 7-stage CI/CD pipeline definition
├── README.md                # Complete documentation, port matrix & runbook
│
├── jenkins/
│   ├── Dockerfile           # Custom Jenkins Controller with Docker CLI, Helm v3 & kubectl
│   ├── plugins.txt          # Essential plugins: workflow-aggregator, casc, git, docker
│   ├── casc.yaml            # Jenkins Configuration as Code: auto-creates 'shopsphere-ci-cd' pipeline
│   └── setup.sh             # 1-click startup bash script
│
├── app/
│   ├── frontend/
│   │   ├── index.html       # Storefront UI with responsive catalog & cart drawer
│   │   ├── style.css        # Clean dark-mode design system & animations
│   │   ├── nginx.conf       # Reverse proxy, gzip, health checks & SPA routing
│   │   └── Dockerfile       # Multi-stage Alpine Nginx image
│   │
│   └── backend/
│       ├── package.json     # Node.js dependencies & test scripts
│       ├── server.js        # Express REST API & Kubernetes probes (/healthz, /readyz)
│       ├── server.test.js   # Automated unit tests using node:test runner
│       └── Dockerfile       # Security-hardened non-root Node.js Alpine image
│
├── helm/
│   └── shopsphere/
│       ├── Chart.yaml       # Helm chart metadata v1.0.0
│       ├── values.yaml      # Default base values & resource configurations
│       ├── values-dev.yaml  # Development environment configuration
│       ├── values-staging.yaml # Staging environment configuration with SSL certs
│       ├── values-prod.yaml # Production values: HPA, TLS, pod anti-affinity
│       │
│       └── templates/
│           ├── _helpers.tpl            # Template helpers & label generators
│           ├── backend-deployment.yaml # Backend microservice Pods with probes
│           ├── frontend-deployment.yaml# Nginx static client Pods
│           ├── backend-service.yaml    # Internal ClusterIP service (port 5000)
│           ├── frontend-service.yaml   # Frontend ClusterIP / LoadBalancer (port 80)
│           ├── ingress.yaml            # NGINX Ingress rules with path routing
│           ├── configmap.yaml          # Cluster runtime settings
│           ├── secret.yaml             # Database & JWT sensitive credentials
│           ├── hpa.yaml                # HorizontalPodAutoscalers (CPU/Memory)
│           ├── serviceaccount.yaml     # Kubernetes ServiceAccount
│           └── NOTES.txt               # Post-installation instructions
│
└── argocd/
    ├── application-dev.yaml  # ArgoCD GitOps application for Dev
    ├── application-prod.yaml # ArgoCD GitOps application for Prod
    └── root-app.yaml         # App-of-Apps parent configuration
```

---

## 🧪 Automated Testing & Microservice Verification

### 1. Run Automated Unit & Probe Tests Locally (Node.js Built-in Runner)
```bash
cd app/backend
npm install
npm test
```

**Verification Results:**
- `GET /healthz`: Kubernetes Liveness Probe returns `200 OK`
- `GET /readyz`: Kubernetes Readiness Probe returns `200 READY`
- `GET /api/health`: Diagnostics verify database and cache connectivity
- `GET /api/config`: Exposes active runtime configuration from ConfigMap
- `GET /api/products`: Validates catalog retrieval and category filters
- `POST /api/orders`: Validates payload schema, order ID generation, and discount calculations

---

## ⎈ Helm Chart Deployment (Minikube / Kind / Kubernetes)

### 1. Lint the Helm Chart:
```bash
helm lint ./helm/shopsphere -f ./helm/shopsphere/values-dev.yaml
helm lint ./helm/shopsphere -f ./helm/shopsphere/values-prod.yaml
```

### 2. Dry-Run Template Rendering:
```bash
helm template shopsphere ./helm/shopsphere -f ./helm/shopsphere/values-dev.yaml
```

### 3. Deploy to Kubernetes Cluster:
```bash
# Create namespace
kubectl create namespace shopsphere-dev

# Install Helm release
helm install shopsphere ./helm/shopsphere \
  --namespace shopsphere-dev \
  -f ./helm/shopsphere/values-dev.yaml
```

### 4. Verify Kubernetes Pods & Services:
```bash
kubectl get all -n shopsphere-dev
kubectl get ingress -n shopsphere-dev
```

### 5. Port-Forward Locally:
```bash
# Port-forward Storefront:
kubectl port-forward -n shopsphere-dev svc/shopsphere-frontend 8085:80

# Port-forward Backend:
kubectl port-forward -n shopsphere-dev svc/shopsphere-backend 5000:5000
```

---

## 🐙 ArgoCD GitOps Synchronization

Deploy declarative continuous delivery applications to ArgoCD:

```bash
# Apply development environment
kubectl apply -f ./argocd/application-dev.yaml

# Apply production environment
kubectl apply -f ./argocd/application-prod.yaml

# Or deploy both via App-of-Apps root pattern:
kubectl apply -f ./argocd/root-app.yaml
```

---

## 📡 REST API Reference

| Method | Endpoint | Description | Sample Response |
|---|---|---|---|
| `GET` | `/healthz` | Kubernetes Liveness Probe | `{"status":"OK","uptime":140}` |
| `GET` | `/readyz` | Kubernetes Readiness Probe | `{"status":"READY","ready":true}` |
| `GET` | `/api/health` | Service diagnostics | `{"status":"healthy","database":{"connected":true}}` |
| `GET` | `/api/config` | Runtime cluster config | `{"environment":"development","currency":"USD"}` |
| `GET` | `/api/products` | Catalog listing (supports `?category=`, `?search=`) | `[{"id":1,"name":"Cloud Hoodie","price":59.99}]` |
| `GET` | `/api/products/:id` | Single item details | `{"id":1,"name":"Cloud Hoodie","price":59.99}` |
| `POST` | `/api/orders` | Place order (`{items:[], customer:""}`) | `{"orderId":"ORD-9821","total":119.98}` |
| `GET` | `/api/orders` | Query past orders | `[{"orderId":"ORD-9821","status":"PLACED"}]` |

---

## 🧹 Teardown

To stop and remove all local Docker containers and volumes:
```bash
docker compose down -v
```

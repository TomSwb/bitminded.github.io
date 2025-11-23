# Docker Setup Guide

This guide helps you install Docker and use it with Supabase CLI for automated database comparisons.

## Quick Install

Run the installation script:

```bash
cd supabase
./install-docker.sh
```

After installation, **log out and log back in** (or restart) for the docker group changes to take effect.

## Manual Installation

If you prefer to install manually, follow these steps:

### 1. Update Package Index
```bash
sudo apt-get update
```

### 2. Install Prerequisites
```bash
sudo apt-get install -y ca-certificates curl gnupg lsb-release
```

### 3. Add Docker's Official GPG Key
```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

### 4. Set Up Repository
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 5. Install Docker
```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 6. Add User to Docker Group
```bash
sudo usermod -aG docker $USER
```

### 7. Start Docker Service
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 8. Verify Installation
After logging out and back in:
```bash
docker --version
docker run hello-world
```

## Using Docker with Supabase CLI

Once Docker is installed, you can use Supabase CLI's database comparison features:

```bash
# Link to dev project
supabase link --project-ref eygpejbljuqpxwwoawkn

# Pull schema from dev
supabase db pull

# Link to prod project
supabase link --project-ref dynxqnrkmjcvgzsugxtm

# Compare schemas
supabase db diff
```

## Troubleshooting

### Permission Denied
If you get permission denied errors, make sure you:
1. Logged out and back in after adding user to docker group
2. Or use `newgrp docker` to activate the group in current session

### Docker Daemon Not Running
```bash
sudo systemctl status docker
sudo systemctl start docker
```

### Check Docker Group
```bash
groups | grep docker
```


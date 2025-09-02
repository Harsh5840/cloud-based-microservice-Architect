FROM grafana/grafana:latest

# Create provisioning directories
RUN mkdir -p /etc/grafana/provisioning/dashboards
RUN mkdir -p /etc/grafana/provisioning/datasources

# Environment variables
ENV GF_SECURITY_ADMIN_PASSWORD=admin
ENV GF_SECURITY_ADMIN_USER=admin
ENV GF_PATHS_PROVISIONING=/etc/grafana/provisioning
ENV GF_INSTALL_PLUGINS=grafana-piechart-panel

EXPOSE 3000
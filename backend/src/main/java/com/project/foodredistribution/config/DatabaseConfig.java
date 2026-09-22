package com.project.foodredistribution.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.JpaVendorAdapter;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Properties;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url:jdbc:h2:mem:fooddb;DB_CLOSE_DELAY=-1}")
    private String rawUrl;

    @Value("${spring.datasource.username:sa}")
    private String rawUsername;

    @Value("${spring.datasource.password:}")
    private String rawPassword;

    private String activeDialect = "org.hibernate.dialect.H2Dialect";

    @Bean
    @Primary
    public DataSource dataSource() {
        String jdbcUrl = rawUrl;
        String username = rawUsername;
        String password = rawPassword;
        String driverClass = "org.h2.Driver";
        String dialect = "org.hibernate.dialect.H2Dialect";

        boolean isExternal = false;

        // If DATABASE_URL starts with postgres:// or postgresql:// (Render/Heroku format)
        if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
            try {
                URI uri = new URI(rawUrl);
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                
                if (uri.getUserInfo() != null && !uri.getUserInfo().isEmpty()) {
                    String[] userInfo = uri.getUserInfo().split(":");
                    username = userInfo[0];
                    if (userInfo.length > 1) {
                        password = userInfo[1];
                    }
                }

                jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + "?sslmode=require";
                driverClass = "org.postgresql.Driver";
                dialect = "org.hibernate.dialect.PostgreSQLDialect";
                isExternal = true;
            } catch (Exception e) {
                log.error("Failed to parse PostgreSQL URI: {}", e.getMessage());
            }
        } else if (rawUrl.startsWith("mysql://")) {
            try {
                URI uri = new URI(rawUrl);
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 3306;
                String path = uri.getPath();
                
                if (uri.getUserInfo() != null && !uri.getUserInfo().isEmpty()) {
                    String[] userInfo = uri.getUserInfo().split(":");
                    username = userInfo[0];
                    if (userInfo.length > 1) {
                        password = userInfo[1];
                    }
                }

                jdbcUrl = "jdbc:mysql://" + host + ":" + port + path + "?useSSL=true&allowPublicKeyRetrieval=true";
                driverClass = "com.mysql.cj.jdbc.Driver";
                dialect = "org.hibernate.dialect.MySQLDialect";
                isExternal = true;
            } catch (Exception e) {
                log.error("Failed to parse MySQL URI: {}", e.getMessage());
            }
        } else if (rawUrl.contains("jdbc:mysql:")) {
            driverClass = "com.mysql.cj.jdbc.Driver";
            dialect = "org.hibernate.dialect.MySQLDialect";
            isExternal = true;
        } else if (rawUrl.contains("jdbc:postgresql:")) {
            driverClass = "org.postgresql.Driver";
            dialect = "org.hibernate.dialect.PostgreSQLDialect";
            isExternal = true;
        }

        // Test connection if external
        if (isExternal) {
            log.info("Testing external database connection to: {}", jdbcUrl);
            try {
                Class.forName(driverClass);
                DriverManager.setLoginTimeout(5); // 5 second test limit
                try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
                    log.info("Successfully connected to external database!");
                    activeDialect = dialect;
                }
            } catch (Exception e) {
                log.warn("Could not connect to external database ({}): {}. Falling back to H2 in-memory database for safe deployment.", jdbcUrl, e.getMessage());
                // Fallback to H2
                jdbcUrl = "jdbc:h2:mem:fooddb;DB_CLOSE_DELAY=-1";
                username = "sa";
                password = "";
                driverClass = "org.h2.Driver";
                activeDialect = "org.hibernate.dialect.H2Dialect";
            }
        } else {
            activeDialect = dialect;
        }

        HikariConfig config = new HikariConfig();
        config.setDriverClassName(driverClass);
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setInitializationFailTimeout(5000);
        config.setConnectionTimeout(10000);
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);

        return new HikariDataSource(config);
    }

    @Bean
    @Primary
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.project.foodredistribution.entity");

        JpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Properties properties = new Properties();
        properties.setProperty("hibernate.hbm2ddl.auto", "update");
        properties.setProperty("hibernate.show_sql", "false");
        properties.setProperty("hibernate.dialect", activeDialect);
        log.info("Active Hibernate Dialect set to: {}", activeDialect);

        em.setJpaProperties(properties);
        return em;
    }

    @Bean
    @Primary
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
